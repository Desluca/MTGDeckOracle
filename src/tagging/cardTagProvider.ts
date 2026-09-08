import { readFile } from "node:fs/promises";

import { normalizeLookupName } from "../card-data/index.js";
import type { FunctionalTag } from "../domain/index.js";

export interface CardTagProvider {
  findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>>;
  findTagEvidenceByNames?(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly CardTagEvidence[]>>;
}

export interface CardTagEvidence {
  readonly tag: FunctionalTag;
  readonly source: string;
  readonly confidence: number;
  readonly rawLabel?: string;
}

export interface ExternalCardTagEvidenceInput {
  readonly tag?: string;
  readonly label?: string;
  readonly source?: string;
  readonly confidence?: number;
}

export type ExternalCardTagInput = string | ExternalCardTagEvidenceInput;

export interface ExternalCardTagEntry {
  readonly name?: string;
  readonly normalizedName?: string;
  readonly tags: readonly ExternalCardTagInput[];
  readonly source?: string;
}

interface ExternalCardTagFile {
  readonly cards?: readonly ExternalCardTagEntry[];
}

const FUNCTIONAL_TAGS = new Set<FunctionalTag>([
  "ramp",
  "fast_mana",
  "mana_fixing",
  "card_draw",
  "card_selection",
  "tutor",
  "spot_removal",
  "board_wipe",
  "counterspell",
  "protection",
  "recursion",
  "graveyard_hate",
  "graveyard_synergy",
  "stax",
  "combo_piece",
  "combo_payoff",
  "win_condition",
  "commander_synergy",
  "value_engine",
  "land",
]);

const EXTERNAL_TAG_ALIASES = new Map<string, FunctionalTag>([
  ["advantage", "card_draw"],
  ["aristocrats", "graveyard_synergy"],
  ["board wipe", "board_wipe"],
  ["board wipes", "board_wipe"],
  ["cantrip", "card_selection"],
  ["card advantage", "card_draw"],
  ["card draw", "card_draw"],
  ["combo", "combo_piece"],
  ["combo payoff", "combo_payoff"],
  ["counter", "counterspell"],
  ["counterspell", "counterspell"],
  ["draw", "card_draw"],
  ["engine", "value_engine"],
  ["fast mana", "fast_mana"],
  ["finisher", "win_condition"],
  ["graveyard", "graveyard_synergy"],
  ["graveyard hate", "graveyard_hate"],
  ["interaction", "spot_removal"],
  ["lands", "land"],
  ["mana", "ramp"],
  ["mana acceleration", "ramp"],
  ["mana fixing", "mana_fixing"],
  ["protection", "protection"],
  ["ramp", "ramp"],
  ["recursion", "recursion"],
  ["removal", "spot_removal"],
  ["selection", "card_selection"],
  ["spot removal", "spot_removal"],
  ["stax", "stax"],
  ["tutor", "tutor"],
  ["tutors", "tutor"],
  ["value", "value_engine"],
  ["wincon", "win_condition"],
  ["win condition", "win_condition"],
]);

export class InMemoryCardTagProvider implements CardTagProvider {
  private readonly evidenceByNormalizedName: ReadonlyMap<string, readonly CardTagEvidence[]>;

  constructor(entries: readonly ExternalCardTagEntry[]) {
    this.evidenceByNormalizedName = entriesToEvidenceMap(entries);
  }

  async findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
    return evidenceMapToTagMap(await this.findTagEvidenceByNames(normalizedNames));
  }

  async findTagEvidenceByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly CardTagEvidence[]>> {
    const evidenceByName = new Map<string, readonly CardTagEvidence[]>();

    for (const normalizedName of normalizedNames) {
      const evidence = this.evidenceByNormalizedName.get(normalizedName);
      if (evidence && evidence.length > 0) {
        evidenceByName.set(normalizedName, evidence);
      }
    }

    return evidenceByName;
  }
}

export class FileCardTagProvider implements CardTagProvider {
  private loadedEvidence?: Promise<ReadonlyMap<string, readonly CardTagEvidence[]>>;

  constructor(private readonly filePath: string) {}

  async findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
    return evidenceMapToTagMap(await this.findTagEvidenceByNames(normalizedNames));
  }

  async findTagEvidenceByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly CardTagEvidence[]>> {
    const evidenceByNormalizedName = await this.loadEvidence();
    const evidenceByName = new Map<string, readonly CardTagEvidence[]>();

    for (const normalizedName of normalizedNames) {
      const evidence = evidenceByNormalizedName.get(normalizedName);
      if (evidence && evidence.length > 0) {
        evidenceByName.set(normalizedName, evidence);
      }
    }

    return evidenceByName;
  }

  private loadEvidence(): Promise<ReadonlyMap<string, readonly CardTagEvidence[]>> {
    this.loadedEvidence ??= readExternalTagFile(this.filePath);
    return this.loadedEvidence;
  }
}

export function normalizeExternalTagLabel(label: string): FunctionalTag | undefined {
  const normalizedLabel = label.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const directTag = normalizedLabel.replace(/\s+/g, "_");

  if (FUNCTIONAL_TAGS.has(directTag as FunctionalTag)) {
    return directTag as FunctionalTag;
  }

  return EXTERNAL_TAG_ALIASES.get(normalizedLabel);
}

async function readExternalTagFile(filePath: string): Promise<ReadonlyMap<string, readonly CardTagEvidence[]>> {
  const rawContents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawContents) as unknown;

  if (Array.isArray(parsed)) {
    return entriesToEvidenceMap(parsed as readonly ExternalCardTagEntry[]);
  }

  if (isExternalCardTagFile(parsed)) {
    return entriesToEvidenceMap(parsed.cards);
  }

  if (isTagDictionary(parsed)) {
    return objectToEvidenceMap(parsed);
  }

  return new Map();
}

function entriesToEvidenceMap(entries: readonly ExternalCardTagEntry[]): ReadonlyMap<string, readonly CardTagEvidence[]> {
  const evidenceByName = new Map<string, CardTagEvidence[]>();

  for (const entry of entries) {
    if (!isExternalCardTagEntry(entry)) {
      continue;
    }

    const normalizedName = entry.normalizedName ?? (entry.name ? normalizeLookupName(entry.name) : undefined);
    if (!normalizedName) {
      continue;
    }

    mergeEvidence(evidenceByName, normalizedName, entry.tags, entry.source ?? "unknown");
  }

  return freezeEvidenceMap(evidenceByName);
}

function objectToEvidenceMap(entriesByName: Record<string, readonly ExternalCardTagInput[]>): ReadonlyMap<string, readonly CardTagEvidence[]> {
  const evidenceByName = new Map<string, CardTagEvidence[]>();

  for (const [name, tags] of Object.entries(entriesByName)) {
    if (Array.isArray(tags)) {
      mergeEvidence(evidenceByName, normalizeLookupName(name), tags, "unknown");
    }
  }

  return freezeEvidenceMap(evidenceByName);
}

function mergeEvidence(
  evidenceByName: Map<string, CardTagEvidence[]>,
  normalizedName: string,
  externalTags: readonly ExternalCardTagInput[],
  defaultSource: string,
): void {
  const evidence = evidenceByName.get(normalizedName) ?? [];

  for (const externalTag of externalTags) {
    const tagEvidence = normalizeExternalTagEvidence(externalTag, defaultSource);
    if (tagEvidence && !evidence.some((existing) => existing.tag === tagEvidence.tag && existing.source === tagEvidence.source)) {
      evidence.push(tagEvidence);
    }
  }

  if (evidence.length > 0) {
    evidenceByName.set(normalizedName, evidence);
  }
}

function normalizeExternalTagEvidence(input: ExternalCardTagInput, defaultSource: string): CardTagEvidence | undefined {
  const rawLabel = typeof input === "string" ? input : input.tag ?? input.label;
  if (!rawLabel) {
    return undefined;
  }

  const tag = normalizeExternalTagLabel(rawLabel);
  if (!tag) {
    return undefined;
  }

  const source = typeof input === "string" ? defaultSource : input.source ?? defaultSource;
  const confidence = typeof input === "string" ? defaultConfidenceForSource(source) : normalizeConfidence(input.confidence ?? defaultConfidenceForSource(source));

  return {
    tag,
    source,
    confidence,
    ...(rawLabel !== tag ? { rawLabel } : {}),
  };
}

function defaultConfidenceForSource(source: string): number {
  switch (source) {
    case "manual":
      return 1;
    case "commander_spellbook":
      return 0.95;
    case "archidekt":
    case "moxfield":
      return 0.8;
    default:
      return 0.65;
  }
}

function normalizeConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) {
    return 0.65;
  }

  return Math.min(1, Math.max(0, confidence));
}

function evidenceMapToTagMap(evidenceByName: ReadonlyMap<string, readonly CardTagEvidence[]>): ReadonlyMap<string, readonly FunctionalTag[]> {
  return new Map(
    [...evidenceByName.entries()].map(([name, evidence]) => [
      name,
      [...new Set(evidence.map((tagEvidence) => tagEvidence.tag))].sort(),
    ]),
  );
}

function freezeEvidenceMap(evidenceByName: Map<string, CardTagEvidence[]>): ReadonlyMap<string, readonly CardTagEvidence[]> {
  return new Map(
    [...evidenceByName.entries()].map(([name, evidence]) => [
      name,
      [...evidence].sort((left, right) => left.tag.localeCompare(right.tag) || left.source.localeCompare(right.source)),
    ]),
  );
}

function isExternalCardTagFile(value: unknown): value is Required<ExternalCardTagFile> {
  return typeof value === "object" && value !== null && "cards" in value && Array.isArray(value.cards);
}

function isTagDictionary(value: unknown): value is Record<string, readonly ExternalCardTagInput[]> {
  return typeof value === "object" && value !== null && Object.values(value).every((tags) => Array.isArray(tags));
}

function isExternalCardTagEntry(value: unknown): value is ExternalCardTagEntry {
  return typeof value === "object" && value !== null && "tags" in value && Array.isArray(value.tags);
}

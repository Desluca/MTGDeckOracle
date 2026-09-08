import { readFile } from "node:fs/promises";

import { normalizeLookupName } from "../card-data/index.js";
import type { FunctionalTag } from "../domain/index.js";

export interface CardTagProvider {
  findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>>;
}

export interface ExternalCardTagEntry {
  readonly name?: string;
  readonly normalizedName?: string;
  readonly tags: readonly string[];
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
  private readonly tagsByNormalizedName: ReadonlyMap<string, readonly FunctionalTag[]>;

  constructor(entries: readonly ExternalCardTagEntry[]) {
    this.tagsByNormalizedName = entriesToTagMap(entries);
  }

  async findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
    const tagsByName = new Map<string, readonly FunctionalTag[]>();

    for (const normalizedName of normalizedNames) {
      const tags = this.tagsByNormalizedName.get(normalizedName);
      if (tags && tags.length > 0) {
        tagsByName.set(normalizedName, tags);
      }
    }

    return tagsByName;
  }
}

export class FileCardTagProvider implements CardTagProvider {
  private loadedTags?: Promise<ReadonlyMap<string, readonly FunctionalTag[]>>;

  constructor(private readonly filePath: string) {}

  async findTagsByNames(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
    const tagsByNormalizedName = await this.loadTags();
    const tagsByName = new Map<string, readonly FunctionalTag[]>();

    for (const normalizedName of normalizedNames) {
      const tags = tagsByNormalizedName.get(normalizedName);
      if (tags && tags.length > 0) {
        tagsByName.set(normalizedName, tags);
      }
    }

    return tagsByName;
  }

  private loadTags(): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
    this.loadedTags ??= readExternalTagFile(this.filePath);
    return this.loadedTags;
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

async function readExternalTagFile(filePath: string): Promise<ReadonlyMap<string, readonly FunctionalTag[]>> {
  const rawContents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawContents) as unknown;

  if (Array.isArray(parsed)) {
    return entriesToTagMap(parsed as readonly ExternalCardTagEntry[]);
  }

  if (isExternalCardTagFile(parsed)) {
    return entriesToTagMap(parsed.cards);
  }

  if (isTagDictionary(parsed)) {
    return objectToTagMap(parsed);
  }

  return new Map();
}

function entriesToTagMap(entries: readonly ExternalCardTagEntry[]): ReadonlyMap<string, readonly FunctionalTag[]> {
  const tagsByName = new Map<string, FunctionalTag[]>();

  for (const entry of entries) {
    const normalizedName = entry.normalizedName ?? (entry.name ? normalizeLookupName(entry.name) : undefined);
    if (!normalizedName) {
      continue;
    }

    mergeTags(tagsByName, normalizedName, entry.tags);
  }

  return freezeTagMap(tagsByName);
}

function objectToTagMap(entriesByName: Record<string, readonly string[]>): ReadonlyMap<string, readonly FunctionalTag[]> {
  const tagsByName = new Map<string, FunctionalTag[]>();

  for (const [name, tags] of Object.entries(entriesByName)) {
    if (Array.isArray(tags)) {
      mergeTags(tagsByName, normalizeLookupName(name), tags);
    }
  }

  return freezeTagMap(tagsByName);
}

function mergeTags(tagsByName: Map<string, FunctionalTag[]>, normalizedName: string, externalTags: readonly string[]): void {
  const tags = tagsByName.get(normalizedName) ?? [];

  for (const externalTag of externalTags) {
    const tag = normalizeExternalTagLabel(externalTag);
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  if (tags.length > 0) {
    tagsByName.set(normalizedName, tags);
  }
}

function freezeTagMap(tagsByName: Map<string, FunctionalTag[]>): ReadonlyMap<string, readonly FunctionalTag[]> {
  return new Map([...tagsByName.entries()].map(([name, tags]) => [name, [...tags].sort()]));
}

function isExternalCardTagFile(value: unknown): value is Required<ExternalCardTagFile> {
  return typeof value === "object" && value !== null && "cards" in value && Array.isArray(value.cards);
}

function isTagDictionary(value: unknown): value is Record<string, readonly string[]> {
  return typeof value === "object" && value !== null && Object.values(value).every((tags) => Array.isArray(tags));
}

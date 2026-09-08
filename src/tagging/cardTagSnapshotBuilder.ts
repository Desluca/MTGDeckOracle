import type { Card } from "../domain/index.js";
import { normalizeLookupName } from "../card-data/index.js";
import { normalizeExternalTagEvidence } from "./cardTagProvider.js";
import type { CardTagEvidence, ExternalCardTagEntry, ExternalCardTagFile } from "./cardTagProvider.js";
import { inferFunctionalTags } from "./functionalTagger.js";

const ORACLE_TEXT_TAG_CONFIDENCE = 0.9;

export function buildOracleCardTagSnapshot(cards: readonly Card[], generatedAt = new Date().toISOString()): ExternalCardTagFile {
  return {
    generatedAt,
    cards: cards
      .map((card) => buildOracleCardTagEntry(card))
      .filter((entry): entry is ExternalCardTagEntry => Boolean(entry))
      .sort((left, right) => (left.normalizedName ?? "").localeCompare(right.normalizedName ?? "")),
  };
}

export function mergeCardTagSnapshots(
  snapshots: readonly ExternalCardTagFile[],
  generatedAt = new Date().toISOString(),
): ExternalCardTagFile {
  const mergedEntries = new Map<string, { name?: string; evidenceByKey: Map<string, CardTagEvidence> }>();

  for (const snapshot of snapshots) {
    for (const entry of snapshot.cards ?? []) {
      const normalizedName = entry.normalizedName ?? (entry.name ? normalizeLookupName(entry.name) : undefined);
      if (!normalizedName) {
        continue;
      }

      const mergedEntry = mergedEntries.get(normalizedName) ?? {
        ...(entry.name ? { name: entry.name } : {}),
        evidenceByKey: new Map<string, CardTagEvidence>(),
      };

      for (const tagInput of entry.tags) {
        const evidence = normalizeExternalTagEvidence(tagInput, entry.source ?? "unknown");
        if (!evidence) {
          continue;
        }

        const evidenceKey = `${evidence.tag}:${evidence.source}`;
        const existingEvidence = mergedEntry.evidenceByKey.get(evidenceKey);
        if (!existingEvidence || evidence.confidence > existingEvidence.confidence) {
          mergedEntry.evidenceByKey.set(evidenceKey, evidence);
        }
      }

      mergedEntries.set(normalizedName, mergedEntry);
    }
  }

  return {
    generatedAt,
    cards: [...mergedEntries.entries()]
      .map(([normalizedName, entry]) => ({
        ...(entry.name ? { name: entry.name } : {}),
        normalizedName,
        tags: [...entry.evidenceByKey.values()].sort(
          (left, right) => left.tag.localeCompare(right.tag) || left.source.localeCompare(right.source),
        ),
      }))
      .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName)),
  };
}

function buildOracleCardTagEntry(card: Card): ExternalCardTagEntry | undefined {
  const tags = inferFunctionalTags(card);

  if (tags.length === 0) {
    return undefined;
  }

  return {
    name: card.identity.name,
    normalizedName: card.identity.normalizedName,
    source: "oracle_text",
    tags: tags.map((tag) => ({
      tag,
      source: "oracle_text",
      confidence: ORACLE_TEXT_TAG_CONFIDENCE,
    })),
  };
}

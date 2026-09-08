import type { Card } from "../domain/index.js";
import type { ExternalCardTagEntry, ExternalCardTagFile } from "./cardTagProvider.js";
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

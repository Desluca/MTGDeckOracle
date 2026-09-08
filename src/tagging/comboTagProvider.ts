import { normalizeLookupName } from "../card-data/index.js";
import type { DetectedCombo, FunctionalTag, KnownCombo } from "../domain/index.js";
import type { CardTagEvidence, ExternalCardTagFile } from "./cardTagProvider.js";

const COMBO_TAG_CONFIDENCE = 0.95;

export function createComboTagEvidenceByName(
  detectedCombos: readonly DetectedCombo[],
): ReadonlyMap<string, readonly CardTagEvidence[]> {
  const evidenceByName = new Map<string, CardTagEvidence[]>();

  for (const detectedCombo of detectedCombos) {
    for (const presentPieceName of detectedCombo.presentPieces) {
      addComboEvidence(evidenceByName, presentPieceName, "combo_piece", detectedCombo.combo.source);
    }
  }

  return new Map(
    [...evidenceByName.entries()].map(([name, evidence]) => [
      name,
      [...evidence].sort((left, right) => left.tag.localeCompare(right.tag) || left.source.localeCompare(right.source)),
    ]),
  );
}

export function createComboTagsByName(detectedCombos: readonly DetectedCombo[]): ReadonlyMap<string, readonly FunctionalTag[]> {
  return new Map(
    [...createComboTagEvidenceByName(detectedCombos).entries()].map(([name, evidence]) => [
      name,
      [...new Set(evidence.map((tagEvidence) => tagEvidence.tag))].sort(),
    ]),
  );
}

export function buildComboCardTagSnapshot(
  combos: readonly KnownCombo[],
  generatedAt = new Date().toISOString(),
): ExternalCardTagFile {
  const evidenceByName = new Map<string, CardTagEvidence[]>();
  const namesByNormalizedName = new Map<string, string>();

  for (const combo of combos) {
    for (const piece of combo.pieces) {
      addComboEvidence(evidenceByName, piece.cardName, "combo_piece", combo.source);
      namesByNormalizedName.set(normalizeLookupName(piece.cardName), piece.cardName);
    }
  }

  return {
    generatedAt,
    cards: [...evidenceByName.entries()]
      .map(([normalizedName, evidence]) => ({
        name: namesByNormalizedName.get(normalizedName) ?? normalizedName,
        normalizedName,
        source: "commander_spellbook",
        tags: [...evidence].sort((left, right) => left.tag.localeCompare(right.tag) || left.source.localeCompare(right.source)),
      }))
      .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName)),
  };
}

function addComboEvidence(
  evidenceByName: Map<string, CardTagEvidence[]>,
  cardName: string,
  tag: FunctionalTag,
  source: string,
): void {
  const normalizedName = normalizeLookupName(cardName);
  const evidence = evidenceByName.get(normalizedName) ?? [];

  if (!evidence.some((existing) => existing.tag === tag && existing.source === source)) {
    evidence.push({
      tag,
      source,
      confidence: COMBO_TAG_CONFIDENCE,
    });
  }

  evidenceByName.set(normalizedName, evidence);
}

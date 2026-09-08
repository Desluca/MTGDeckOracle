import { normalizeLookupName } from "../card-data/index.js";
import type { DetectedCombo, FunctionalTag } from "../domain/index.js";
import type { CardTagEvidence } from "./cardTagProvider.js";

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

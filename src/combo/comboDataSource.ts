import { normalizeLookupName } from "../card-data/index.js";
import type { KnownCombo } from "../domain/index.js";

export interface ComboDataProvider {
  findCombosForCards(normalizedCardNames: readonly string[]): Promise<readonly KnownCombo[]>;
}

export function filterCombosForCards(
  combos: readonly KnownCombo[],
  normalizedCardNames: readonly string[],
): readonly KnownCombo[] {
  const availableNames = new Set(normalizedCardNames.map((name) => normalizeLookupName(name)));

  return combos.filter((combo) =>
    combo.pieces.some((piece) =>
      [piece.cardName, ...(piece.alternatives ?? [])].some((cardName) => availableNames.has(normalizeLookupName(cardName))),
    ),
  );
}

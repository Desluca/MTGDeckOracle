import { normalizeLookupName } from "../card-data/index.js";
import type { KnownCombo } from "../domain/index.js";
import type { ComboDataProvider } from "./comboDataSource.js";

export class InMemoryComboDataSource implements ComboDataProvider {
  constructor(private readonly combos: readonly KnownCombo[]) {}

  async findCombosForCards(normalizedCardNames: readonly string[]): Promise<readonly KnownCombo[]> {
    const availableNames = new Set(normalizedCardNames.map((name) => normalizeLookupName(name)));

    return this.combos.filter((combo) =>
      combo.pieces.some((piece) =>
        [piece.cardName, ...(piece.alternatives ?? [])].some((cardName) => availableNames.has(normalizeLookupName(cardName))),
      ),
    );
  }
}

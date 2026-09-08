import type { KnownCombo } from "../domain/index.js";
import { filterCombosForCards, type ComboDataProvider } from "./comboDataSource.js";

export class InMemoryComboDataSource implements ComboDataProvider {
  constructor(private readonly combos: readonly KnownCombo[]) {}

  async findCombosForCards(normalizedCardNames: readonly string[]): Promise<readonly KnownCombo[]> {
    return filterCombosForCards(this.combos, normalizedCardNames);
  }
}

import type { KnownCombo } from "../domain/index.js";

export interface ComboDataProvider {
  findCombosForCards(normalizedCardNames: readonly string[]): Promise<readonly KnownCombo[]>;
}

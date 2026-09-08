import type { KnownCombo } from "../domain/index.js";

export interface ComboCache {
  getCatalog(): Promise<readonly KnownCombo[] | undefined>;
  setCatalog(combos: readonly KnownCombo[]): Promise<void>;
  getManyByCard(normalizedNames: readonly string[]): Promise<{
    readonly found: ReadonlyMap<string, readonly KnownCombo[]>;
    readonly missing: readonly string[];
  }>;
  setManyByCard(combosByCard: ReadonlyMap<string, readonly KnownCombo[]>): Promise<void>;
}

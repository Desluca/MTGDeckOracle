import type { Card } from "../domain/index.js";

export interface CardDataSource {
  findCardByName(cardName: string): Promise<Card | undefined>;
  findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>>;
}

export interface CardCache {
  get(normalizedName: string): Promise<Card | undefined>;
  set(normalizedName: string, card: Card): Promise<void>;
  getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>>;
  setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void>;
}

export function uniqueNormalizedNames(cardNames: readonly string[]): readonly string[] {
  return [...new Set(cardNames.map((name) => normalizeLookupName(name)).filter((name) => name.length > 0))];
}

export function normalizeLookupName(cardName: string): string {
  return cardName.trim().toLowerCase().replace(/\s+/g, " ");
}

import type { Card } from "../domain/index.js";
import { findCardByLookupName, uniqueNormalizedNames, type CardDataSource } from "./cardDataSource.js";

export class InMemoryCardDataSource implements CardDataSource {
  constructor(private readonly cardsByNormalizedName: ReadonlyMap<string, Card>) {}

  async findCardByName(cardName: string): Promise<Card | undefined> {
    return findCardByLookupName(this.cardsByNormalizedName, cardName);
  }

  async findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const found = new Map<string, Card>();

    for (const normalizedName of uniqueNormalizedNames(cardNames)) {
      const card = findCardByLookupName(this.cardsByNormalizedName, normalizedName);
      if (card) {
        found.set(normalizedName, card);
      }
    }

    return found;
  }
}

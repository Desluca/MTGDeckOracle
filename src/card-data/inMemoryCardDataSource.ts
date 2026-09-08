import type { Card } from "../domain/index.js";
import { normalizeLookupName, uniqueNormalizedNames, type CardDataSource } from "./cardDataSource.js";

export class InMemoryCardDataSource implements CardDataSource {
  constructor(private readonly cardsByNormalizedName: ReadonlyMap<string, Card>) {}

  async findCardByName(cardName: string): Promise<Card | undefined> {
    return this.cardsByNormalizedName.get(normalizeLookupName(cardName));
  }

  async findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const found = new Map<string, Card>();

    for (const normalizedName of uniqueNormalizedNames(cardNames)) {
      const card = this.cardsByNormalizedName.get(normalizedName);
      if (card) {
        found.set(normalizedName, card);
      }
    }

    return found;
  }
}

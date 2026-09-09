import type { Card } from "../domain/index.js";
import { cardLookupKeys, expandCardLookupMap, findCardByLookupName, normalizeLookupName, type CardCache } from "./cardDataSource.js";

export class InMemoryCardCache implements CardCache {
  private readonly cards = new Map<string, Card>();

  async get(normalizedName: string): Promise<Card | undefined> {
    return findCardByLookupName(this.cards, normalizedName);
  }

  async set(normalizedName: string, card: Card): Promise<void> {
    this.cards.set(normalizeLookupName(normalizedName), card);
    for (const key of cardLookupKeys(card)) {
      this.cards.set(key, card);
    }
  }

  async getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const found = new Map<string, Card>();

    for (const normalizedName of normalizedNames) {
      const card = findCardByLookupName(this.cards, normalizedName);
      if (card) {
        found.set(normalizeLookupName(normalizedName), card);
      }
    }

    return found;
  }

  async setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void> {
    for (const [normalizedName, card] of expandCardLookupMap(cardsByNormalizedName).entries()) {
      this.cards.set(normalizeLookupName(normalizedName), card);
    }
  }
}

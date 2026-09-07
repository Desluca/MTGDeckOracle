import type { Card } from "../domain/index.js";
import type { CardCache } from "./cardDataSource.js";

export class InMemoryCardCache implements CardCache {
  private readonly cards = new Map<string, Card>();

  async get(normalizedName: string): Promise<Card | undefined> {
    return this.cards.get(normalizedName);
  }

  async set(normalizedName: string, card: Card): Promise<void> {
    this.cards.set(normalizedName, card);
  }

  async getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const found = new Map<string, Card>();

    for (const normalizedName of normalizedNames) {
      const card = this.cards.get(normalizedName);
      if (card) {
        found.set(normalizedName, card);
      }
    }

    return found;
  }

  async setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void> {
    for (const [normalizedName, card] of cardsByNormalizedName.entries()) {
      this.cards.set(normalizedName, card);
    }
  }
}

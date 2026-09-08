import type { Card } from "../domain/index.js";
import type { CardCache, CardDataSource } from "./cardDataSource.js";
import { normalizeLookupName, uniqueNormalizedNames } from "./cardDataSource.js";

export class CacheOnlyCardDataSource implements CardDataSource {
  constructor(private readonly cache: CardCache) {}

  async findCardByName(cardName: string): Promise<Card | undefined> {
    return this.cache.get(normalizeLookupName(cardName));
  }

  async findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    return this.cache.getMany(uniqueNormalizedNames(cardNames));
  }
}

import type { Card } from "../domain/index.js";
import type { CardCache, CardDataSource } from "./cardDataSource.js";
import { expandCardLookupMap, normalizeLookupName, uniqueNormalizedNames } from "./cardDataSource.js";

export class CachedCardDataSource implements CardDataSource {
  constructor(
    private readonly source: CardDataSource,
    private readonly cache: CardCache,
  ) {}

  async findCardByName(cardName: string): Promise<Card | undefined> {
    const normalizedName = normalizeLookupName(cardName);
    const cached = await this.cache.get(normalizedName);

    if (cached) {
      return cached;
    }

    const card = await this.source.findCardByName(cardName);
    if (card) {
      await this.cache.setMany(expandCardLookupMap(new Map([[normalizedName, card]])));
    }

    return card;
  }

  async findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const normalizedNames = uniqueNormalizedNames(cardNames);
    const cached = await this.cache.getMany(normalizedNames);
    const missingNames = normalizedNames.filter((name) => !cached.has(name));

    if (missingNames.length === 0) {
      return cached;
    }

    const fetched = await this.source.findCardsByNames(missingNames);
    await this.cache.setMany(expandCardLookupMap(fetched));

    return new Map([...cached.entries(), ...expandCardLookupMap(fetched).entries()]);
  }
}

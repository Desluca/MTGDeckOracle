import type { Card } from "../domain/index.js";
import type { CardDataSource } from "./cardDataSource.js";
import { cardLookupKeys, expandCardLookupMap, normalizeLookupName, scryfallCollectionName, uniqueNormalizedNames } from "./cardDataSource.js";
import { mapScryfallCardToCard } from "./scryfallCardMapper.js";
import type { ScryfallCollectionResponse } from "./scryfallTypes.js";

export interface ScryfallCardDataSourceOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly batchSize?: number;
}

const DEFAULT_API_BASE_URL = "https://api.scryfall.com";
const DEFAULT_BATCH_SIZE = 75;

export class ScryfallCardDataSource implements CardDataSource {
  private readonly apiBaseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly batchSize: number;

  constructor(options: ScryfallCardDataSourceOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  async findCardByName(cardName: string): Promise<Card | undefined> {
    const cards = await this.findCardsByNames([cardName]);
    return cards.get(normalizeLookupName(cardName));
  }

  async findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const normalizedNames = uniqueNormalizedNames(cardNames);
    const foundCards = new Map<string, Card>();

    for (const batch of chunk(normalizedNames, this.batchSize)) {
      const response = await this.fetchCollection(batch);
      const mappedCards = response.data.map(mapScryfallCardToCard);

      for (const card of mappedCards) {
        foundCards.set(normalizeLookupName(card.identity.name), card);
      }

      for (const requestedName of batch) {
        const card = mappedCards.find((candidate) => cardLookupKeys(candidate).includes(requestedName));
        if (card) {
          foundCards.set(requestedName, card);
        }
      }
    }

    return expandCardLookupMap(foundCards);
  }

  private async fetchCollection(cardNames: readonly string[]): Promise<ScryfallCollectionResponse> {
    const response = await this.fetchFn(`${this.apiBaseUrl}/cards/collection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "MTGDeckOracle/0.1.0",
      },
      body: JSON.stringify({
        identifiers: uniqueNormalizedNames(cardNames.map((name) => scryfallCollectionName(name))).map((name) => ({ name })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Scryfall request failed with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ScryfallCollectionResponse;
  }
}

function chunk<T>(items: readonly T[], size: number): readonly T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

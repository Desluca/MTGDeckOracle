import { mapScryfallRandomCard, type ScryfallRandomCard } from "./scryfallRandomCardSource.js";
import type { RatingCard } from "./ratingTypes.js";

export interface RatingCardDetailsSource {
  findCardsByNames(names: readonly string[]): Promise<readonly RatingCard[]>;
}

interface ScryfallCollectionResponse {
  readonly data?: readonly ScryfallRandomCard[];
}

const SCRYFALL_API_BASE_URL = "https://api.scryfall.com";
const SCRYFALL_COLLECTION_SIZE = 75;
const SCRYFALL_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "MTGDeckOracle/0.1.0",
} as const;

export class ScryfallRatingCardDetailsSource implements RatingCardDetailsSource {
  constructor(
    private readonly apiBaseUrl = SCRYFALL_API_BASE_URL,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async findCardsByNames(names: readonly string[]): Promise<readonly RatingCard[]> {
    const cards: RatingCard[] = [];

    for (const chunk of chunks([...new Set(names)], SCRYFALL_COLLECTION_SIZE)) {
      const response = await this.fetchFn(`${this.apiBaseUrl}/cards/collection`, {
        method: "POST",
        headers: SCRYFALL_HEADERS,
        body: JSON.stringify({
          identifiers: chunk.map((name) => ({ name })),
        }),
      });

      if (!response.ok) {
        continue;
      }

      const collection = (await response.json()) as ScryfallCollectionResponse;
      cards.push(...(collection.data ?? []).map(mapScryfallRandomCard));
    }

    return cards;
  }
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const chunkedValues: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunkedValues.push(values.slice(index, index + size));
  }

  return chunkedValues;
}

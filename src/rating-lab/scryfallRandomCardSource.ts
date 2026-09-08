import type { RatingCard } from "./ratingTypes.js";

export interface RandomCardSource {
  getRandomCard(): Promise<RatingCard>;
}

export interface ScryfallRandomCardSourceOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export interface ScryfallRandomCard {
  readonly id: string;
  readonly oracle_id?: string;
  readonly name: string;
  readonly type_line: string;
  readonly cmc: number;
  readonly scryfall_uri?: string;
  readonly image_uris?: {
    readonly normal?: string;
    readonly large?: string;
  };
  readonly card_faces?: readonly {
    readonly image_uris?: {
      readonly normal?: string;
      readonly large?: string;
    };
  }[];
}

interface ScryfallSearchResponse {
  readonly data?: readonly ScryfallRandomCard[];
}

const DEFAULT_API_BASE_URL = "https://api.scryfall.com";
const DEFAULT_RATING = 1500;
const SCRYFALL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MTGDeckOracle/0.1.0",
} as const;

export class ScryfallRandomCardSource implements RandomCardSource {
  private readonly apiBaseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ScryfallRandomCardSourceOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async getRandomCard(): Promise<RatingCard> {
    const randomSearchParams = new URLSearchParams({
      q: "legal:commander",
    });
    const response = await this.fetchFn(`${this.apiBaseUrl}/cards/random?${randomSearchParams.toString()}`, {
      headers: SCRYFALL_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`Scryfall random card request failed with ${response.status} ${response.statusText}`);
    }

    const randomCard = (await response.json()) as ScryfallRandomCard;
    const oldestPrinting = await this.findOldestPrinting(randomCard);

    return mapScryfallRandomCard(oldestPrinting ?? randomCard);
  }

  private async findOldestPrinting(card: ScryfallRandomCard): Promise<ScryfallRandomCard | undefined> {
    if (!card.oracle_id) {
      return undefined;
    }

    const searchParams = new URLSearchParams({
      order: "released",
      dir: "asc",
      unique: "prints",
      q: `oracleid:${card.oracle_id}`,
    });
    const response = await this.fetchFn(`${this.apiBaseUrl}/cards/search?${searchParams.toString()}`, {
      headers: SCRYFALL_HEADERS,
    });

    if (!response.ok) {
      return undefined;
    }

    const searchResult = (await response.json()) as ScryfallSearchResponse;
    return searchResult.data?.find((printing) => imageUrl(printing));
  }
}

export function mapScryfallRandomCard(card: ScryfallRandomCard): RatingCard {
  const selectedImageUrl = imageUrl(card);

  return {
    id: card.oracle_id ?? card.id,
    ...(card.oracle_id ? { oracleId: card.oracle_id } : {}),
    name: card.name,
    typeLine: card.type_line,
    manaValue: card.cmc,
    ...(selectedImageUrl ? { imageUrl: selectedImageUrl } : {}),
    ...(card.scryfall_uri ? { scryfallUri: card.scryfall_uri } : {}),
    rating: DEFAULT_RATING,
    wins: 0,
    losses: 0,
  };
}

function imageUrl(card: ScryfallRandomCard): string | undefined {
  return card.image_uris?.normal ?? card.image_uris?.large ?? card.card_faces?.[0]?.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.large;
}

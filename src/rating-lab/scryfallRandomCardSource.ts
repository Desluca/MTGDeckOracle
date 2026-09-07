import type { RatingCard } from "./ratingTypes.js";

export interface RandomCardSource {
  getRandomCard(): Promise<RatingCard>;
}

export interface ScryfallRandomCardSourceOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

interface ScryfallRandomCard {
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

const DEFAULT_API_BASE_URL = "https://api.scryfall.com";
const DEFAULT_RATING = 1500;

export class ScryfallRandomCardSource implements RandomCardSource {
  private readonly apiBaseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ScryfallRandomCardSourceOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async getRandomCard(): Promise<RatingCard> {
    const response = await this.fetchFn(`${this.apiBaseUrl}/cards/random`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MTGDeckOracle/0.1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Scryfall random card request failed with ${response.status} ${response.statusText}`);
    }

    return mapScryfallRandomCard((await response.json()) as ScryfallRandomCard);
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

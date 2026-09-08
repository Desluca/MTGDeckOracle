import type { Card } from "../domain/index.js";
import { mapScryfallCardToCard } from "./scryfallCardMapper.js";
import type { ScryfallBulkData, ScryfallCard } from "./scryfallTypes.js";

export interface ScryfallBulkCardSourceOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly bulkType?: string;
}

const DEFAULT_API_BASE_URL = "https://api.scryfall.com";
const DEFAULT_BULK_TYPE = "oracle-cards";

export class ScryfallBulkCardSource {
  private readonly apiBaseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly bulkType: string;

  constructor(options: ScryfallBulkCardSourceOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.bulkType = options.bulkType ?? DEFAULT_BULK_TYPE;
  }

  async findCommanderLegalCards(): Promise<readonly Card[]> {
    const bulkData = await this.fetchBulkData();
    const scryfallCards = await this.fetchBulkCards(bulkData.download_uri);
    const cardsByName = new Map<string, Card>();

    for (const scryfallCard of scryfallCards) {
      if (scryfallCard.legalities.commander !== "legal") {
        continue;
      }

      const card = mapScryfallCardToCard(scryfallCard);
      cardsByName.set(card.identity.normalizedName, card);
    }

    return [...cardsByName.values()].sort((left, right) => left.identity.normalizedName.localeCompare(right.identity.normalizedName));
  }

  private async fetchBulkData(): Promise<ScryfallBulkData> {
    const response = await this.fetchFn(`${this.apiBaseUrl}/bulk-data/${this.bulkType}`, {
      headers: requestHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Scryfall bulk metadata request failed with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ScryfallBulkData;
  }

  private async fetchBulkCards(downloadUri: string): Promise<readonly ScryfallCard[]> {
    const response = await this.fetchFn(downloadUri, {
      headers: requestHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Scryfall bulk card download failed with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as readonly ScryfallCard[];
  }
}

function requestHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": "MTGDeckOracle/0.1.0",
  };
}

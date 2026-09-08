import { describe, expect, it, vi } from "vitest";

import { ScryfallBulkCardSource, type ScryfallCard, type ScryfallBulkData } from "../../src/card-data/index.js";

describe("ScryfallBulkCardSource", () => {
  it("downloads bulk cards and keeps commander-legal cards", async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://api.scryfall.com/bulk-data/oracle-cards") {
        return jsonResponse(createBulkData({ download_uri: "https://data.scryfall.test/oracle-cards.json" }));
      }

      return jsonResponse([
        createScryfallCard({ name: "Sol Ring", legalities: { commander: "legal" } }),
        createScryfallCard({ name: "Banned Card", legalities: { commander: "banned" } }),
      ]);
    });
    const source = new ScryfallBulkCardSource({ fetchFn });

    const cards = await source.findCommanderLegalCards();

    expect(cards.map((card) => card.identity.name)).toEqual(["Sol Ring"]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws when bulk metadata cannot be loaded", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 500, statusText: "Server Error" }));
    const source = new ScryfallBulkCardSource({ fetchFn });

    await expect(source.findCommanderLegalCards()).rejects.toThrow("Scryfall bulk metadata request failed");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createBulkData(overrides: Partial<ScryfallBulkData> = {}): ScryfallBulkData {
  return {
    id: "bulk-id",
    type: "oracle_cards",
    name: "Oracle Cards",
    download_uri: "https://data.scryfall.test/cards.json",
    ...overrides,
  };
}

function createScryfallCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: "scryfall-id",
    oracle_id: "oracle-id",
    name: "Sol Ring",
    cmc: 1,
    colors: [],
    color_identity: [],
    type_line: "Artifact",
    oracle_text: "{T}: Add {C}{C}.",
    legalities: {
      commander: "legal",
    },
    ...overrides,
  };
}

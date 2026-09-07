import { describe, expect, it, vi } from "vitest";

import { ScryfallCardDataSource, type ScryfallCard } from "../../src/card-data/index.js";

describe("ScryfallCardDataSource", () => {
  it("fetches cards through the Scryfall collection endpoint", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [createScryfallCard({ name: "Sol Ring" })],
      }),
    );
    const source = new ScryfallCardDataSource({ fetchFn });

    const cards = await source.findCardsByNames(["Sol Ring"]);

    expect(cards.get("sol ring")?.identity.name).toBe("Sol Ring");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/collection",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ identifiers: [{ name: "sol ring" }] }),
      }),
    );
  });

  it("deduplicates requested names before fetching", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [createScryfallCard({ name: "Sol Ring" })],
      }),
    );
    const source = new ScryfallCardDataSource({ fetchFn });

    await source.findCardsByNames(["Sol Ring", "sol   ring", "SOL RING"]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ identifiers: [{ name: "sol ring" }] }),
      }),
    );
  });

  it("splits large requests into batches", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [],
      }),
    );
    const source = new ScryfallCardDataSource({ fetchFn, batchSize: 2 });

    await source.findCardsByNames(["Card A", "Card B", "Card C", "Card D", "Card E"]);

    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("supports single-card lookup", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [createScryfallCard({ name: "Arcane Signet" })],
      }),
    );
    const source = new ScryfallCardDataSource({ fetchFn });

    const card = await source.findCardByName("Arcane Signet");

    expect(card?.identity.normalizedName).toBe("arcane signet");
  });

  it("throws on non-OK Scryfall responses", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 500, statusText: "Server Error" }));
    const source = new ScryfallCardDataSource({ fetchFn });

    await expect(source.findCardsByNames(["Sol Ring"])).rejects.toThrow("Scryfall request failed");
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

function createScryfallCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: "scryfall-id",
    oracle_id: "oracle-id",
    name: "Sol Ring",
    set: "cmm",
    collector_number: "400",
    mana_cost: "{1}",
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

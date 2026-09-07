import { describe, expect, it, vi } from "vitest";

import { mapScryfallRandomCard, ScryfallRandomCardSource } from "../../src/rating-lab/index.js";

describe("ScryfallRandomCardSource", () => {
  it("fetches a random card and uses its oldest printing image", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(scryfallCard()))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              ...scryfallCard(),
              id: "old-print-id",
              scryfall_uri: "https://scryfall.com/card/old-print",
              image_uris: {
                normal: "https://example.com/oldest.jpg",
              },
            },
          ],
        }),
      );
    const source = new ScryfallRandomCardSource({ fetchFn });

    const card = await source.getRandomCard();

    expect(card.name).toBe("Sol Ring");
    expect(card.rating).toBe(1500);
    expect(card.imageUrl).toBe("https://example.com/oldest.jpg");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/random?q=legal%3Acommander",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "User-Agent": "MTGDeckOracle/0.1.0",
        }),
      }),
    );
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/search?order=released&dir=asc&unique=prints&q=oracleid%3Aoracle-id",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "User-Agent": "MTGDeckOracle/0.1.0",
        }),
      }),
    );
  });

  it("throws on failed random requests", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 500, statusText: "Server Error" }));
    const source = new ScryfallRandomCardSource({ fetchFn });

    await expect(source.getRandomCard()).rejects.toThrow("Scryfall random card request failed");
  });

  it("falls back to the random printing image when oldest printing lookup fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(scryfallCard()))
      .mockResolvedValueOnce(new Response("{}", { status: 500, statusText: "Server Error" }));
    const source = new ScryfallRandomCardSource({ fetchFn });

    await expect(source.getRandomCard()).resolves.toMatchObject({
      imageUrl: "https://example.com/normal.jpg",
    });
  });
});

describe("mapScryfallRandomCard", () => {
  it("uses face images when top-level image is missing", () => {
    const { image_uris: _imageUris, ...cardWithoutTopLevelImage } = scryfallCard();
    const card = mapScryfallRandomCard({
      ...cardWithoutTopLevelImage,
      card_faces: [
        {
          image_uris: {
            normal: "https://example.com/face.jpg",
          },
        },
      ],
    });

    expect(card.imageUrl).toBe("https://example.com/face.jpg");
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

function scryfallCard() {
  return {
    id: "print-id",
    oracle_id: "oracle-id",
    name: "Sol Ring",
    type_line: "Artifact",
    cmc: 1,
    scryfall_uri: "https://scryfall.com/card/test",
    image_uris: {
      normal: "https://example.com/normal.jpg",
    },
  };
}

import { describe, expect, it, vi } from "vitest";

import { ScryfallRatingCardDetailsSource } from "../../src/rating-lab/index.js";

describe("ScryfallRatingCardDetailsSource", () => {
  it("fetches card details by names through Scryfall collection", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [
          {
            id: "sol-ring-print",
            oracle_id: "sol-ring",
            name: "Sol Ring",
            type_line: "Artifact",
            cmc: 1,
            image_uris: {
              normal: "https://example.com/sol-ring.jpg",
            },
          },
        ],
      }),
    );
    const source = new ScryfallRatingCardDetailsSource("https://api.scryfall.test", fetchFn);

    const cards = await source.findCardsByNames(["Sol Ring"]);

    expect(cards[0]).toMatchObject({
      id: "sol-ring",
      name: "Sol Ring",
      imageUrl: "https://example.com/sol-ring.jpg",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.scryfall.test/cards/collection",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifiers: [{ name: "Sol Ring" }],
        }),
      }),
    );
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

import { describe, expect, it } from "vitest";

import { createCardMap, createTestCard } from "../utils/cardFactory.js";
import { parseDeckList } from "../../src/parser/index.js";
import { resolveDeckList } from "../../src/deck/index.js";
import type { CardDataSource } from "../../src/card-data/index.js";

describe("resolveDeckList", () => {
  it("creates a DeckList when every card is resolved", async () => {
    const commander = createTestCard({
      name: "Azorius Commander",
      colorIdentity: ["W", "U"],
      canBeCommander: true,
    });
    const solRing = createTestCard({ name: "Sol Ring" });
    const source = createStaticSource([commander, solRing]);
    const parsed = parseDeckList("Commander\n1 Azorius Commander\nDeck\n1 Sol Ring");

    const result = await resolveDeckList(parsed, source);

    expect(result.unresolvedNames).toEqual([]);
    expect(result.deck?.commander.colorIdentity).toEqual(["W", "U"]);
    expect(result.deck?.commander.commanders[0]?.card.identity.name).toBe("Azorius Commander");
    expect(result.deck?.cards).toHaveLength(2);
  });

  it("returns unresolved names when a card is missing", async () => {
    const commander = createTestCard({
      name: "Azorius Commander",
      colorIdentity: ["W", "U"],
      canBeCommander: true,
    });
    const source = createStaticSource([commander]);
    const parsed = parseDeckList("Commander\n1 Azorius Commander\nDeck\n1 Missing Card");

    const result = await resolveDeckList(parsed, source);

    expect(result.deck).toBeUndefined();
    expect(result.unresolvedNames).toEqual(["missing card"]);
  });
});

function createStaticSource(cards: Parameters<typeof createCardMap>[0]): CardDataSource {
  const cardMap = createCardMap(cards);

  return {
    async findCardByName(cardName) {
      return cardMap.get(cardName.toLowerCase());
    },
    async findCardsByNames(cardNames) {
      return new Map(cardNames.flatMap((name) => {
        const card = cardMap.get(name.toLowerCase());
        return card ? [[card.identity.normalizedName, card] as const] : [];
      }));
    },
  };
}

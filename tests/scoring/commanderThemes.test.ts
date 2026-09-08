import { describe, expect, it } from "vitest";

import { inferCommanderThemes } from "../../src/scoring/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("inferCommanderThemes", () => {
  it("detects multiple commander themes from tags and oracle text", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Teysa Karlov",
          canBeCommander: true,
          typeLine: "Legendary Creature — Human Advisor",
          oracleText: "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time. Whenever a creature you control dies, you gain 1 life.",
          functionalTags: ["aristocrats", "lifegain"],
        }),
      ],
      mainboard: [mainboardCard(createTestCard({ name: "Filler" }))],
    });

    expect(inferCommanderThemes(deck.cards)).toEqual(expect.arrayContaining(["aristocrats", "lifegain"]));
  });
});

import { describe, expect, it } from "vitest";

import { analyzeDeckStructure } from "../../src/analysis/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("analyzeDeckStructure", () => {
  it("calculates deck composition", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Plains", types: ["land"], typeLine: "Basic Land — Plains" }), 38),
        mainboardCard(createTestCard({ name: "Two Drop", manaValue: 2 }), 10),
        mainboardCard(createTestCard({ name: "Four Drop", manaValue: 4 }), 5),
      ],
    });

    const summary = analyzeDeckStructure(deck);

    expect(summary.composition.totalCards).toBe(54);
    expect(summary.composition.commanderCount).toBe(1);
    expect(summary.composition.mainboardCount).toBe(53);
    expect(summary.composition.landCount).toBe(38);
    expect(summary.composition.nonlandCount).toBe(16);
    expect(summary.composition.averageManaValue).toBe(2.56);
  });

  it("builds a sorted nonland mana curve", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Five Drop", manaValue: 5 }), 1),
        mainboardCard(createTestCard({ name: "Two Drop", manaValue: 2 }), 3),
        mainboardCard(createTestCard({ name: "Zero Drop", manaValue: 0 }), 2),
      ],
    });

    const summary = analyzeDeckStructure(deck);

    expect(summary.manaCurve).toEqual([
      { manaValue: 0, count: 2 },
      { manaValue: 1, count: 1 },
      { manaValue: 2, count: 3 },
      { manaValue: 5, count: 1 },
    ]);
  });

  it("does not include lands in the mana curve", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 10),
        mainboardCard(createTestCard({ name: "Counterspell", manaValue: 2 }), 1),
      ],
    });

    const summary = analyzeDeckStructure(deck);

    expect(summary.manaCurve).toEqual([
      { manaValue: 1, count: 1 },
      { manaValue: 2, count: 1 },
    ]);
  });

  it("counts functional roles with quantities", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Ramp Spell", functionalTags: ["ramp"] }), 3),
        mainboardCard(createTestCard({ name: "Draw Spell", functionalTags: ["card_draw"] }), 2),
        mainboardCard(createTestCard({ name: "Flexible Spell", functionalTags: ["card_draw", "spot_removal"] }), 1),
      ],
    });

    const summary = analyzeDeckStructure(deck);

    expect(summary.roleCounts).toEqual([
      { tag: "card_draw", count: 3 },
      { tag: "ramp", count: 3 },
      { tag: "spot_removal", count: 1 },
    ]);
  });
});

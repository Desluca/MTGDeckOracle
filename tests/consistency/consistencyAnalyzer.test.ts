import { describe, expect, it } from "vitest";

import { analyzeConsistency } from "../../src/consistency/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("analyzeConsistency", () => {
  it("creates probability signals for key deck functions", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 10),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 10),
        mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"] }), 3),
      ],
    });

    const analysis = analyzeConsistency(deck);

    expect(analysis.signals.map((signal) => signal.name)).toEqual([
      "early_land_access",
      "early_ramp_access",
      "card_advantage_access",
      "win_condition_access",
    ]);
    expect(analysis.score).toBeGreaterThan(0);
  });

  it("reduces consistency for larger decks against a 100-card baseline", () => {
    const hundredCardDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }), 99),
      ],
    });
    const twoHundredCardDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }), 199),
      ],
    });

    expect(analyzeConsistency(twoHundredCardDeck).sizeMultiplier).toBeLessThan(analyzeConsistency(hundredCardDeck).sizeMultiplier);
  });
});

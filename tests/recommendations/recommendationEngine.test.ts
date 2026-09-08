import { describe, expect, it } from "vitest";

import { analyzeDeckStructure } from "../../src/analysis/index.js";
import { recommendDeckImprovements } from "../../src/recommendations/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("recommendDeckImprovements", () => {
  it("recommends mana base improvements for low land counts", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 20),
        mainboardCard(createTestCard({ name: "Expensive Filler", manaValue: 6 }), 50),
      ],
    });

    const recommendations = recommendDeckImprovements(deck, analyzeDeckStructure(deck));

    expect(recommendations).toContainEqual(expect.objectContaining({ category: "mana_base", priority: "high" }));
  });

  it("recommends ramp when ramp density is low", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 4 }), 62),
      ],
    });

    const recommendations = recommendDeckImprovements(deck, analyzeDeckStructure(deck));

    expect(recommendations.find((recommendation) => recommendation.category === "ramp")?.suggestedAdds).toContain("Arcane Signet");
  });

  it("recommends interaction when answers are missing", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 10),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 10),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 42),
      ],
    });

    const recommendations = recommendDeckImprovements(deck, analyzeDeckStructure(deck));

    expect(recommendations).toContainEqual(expect.objectContaining({ category: "interaction" }));
  });

  it("recommends card advantage and win conditions when those packages are missing", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 10),
        mainboardCard(createTestCard({ name: "Removal", functionalTags: ["spot_removal"] }), 8),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 2 }), 44),
      ],
    });

    const recommendations = recommendDeckImprovements(deck, analyzeDeckStructure(deck));

    expect(recommendations.map((recommendation) => recommendation.category)).toEqual(
      expect.arrayContaining(["card_advantage", "win_conditions"]),
    );
  });

  it("suggests expensive cards as cuts for high curves", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
        mainboardCard(createTestCard({ name: "Seven Mana Spell", manaValue: 7 }), 1),
        mainboardCard(createTestCard({ name: "Six Mana Spell", manaValue: 6 }), 1),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 4 }), 61),
      ],
    });

    const recommendations = recommendDeckImprovements(deck, analyzeDeckStructure(deck));

    expect(recommendations.find((recommendation) => recommendation.category === "curve")?.suggestedCuts).toEqual(
      expect.arrayContaining(["Seven Mana Spell", "Six Mana Spell"]),
    );
  });
});

import { describe, expect, it } from "vitest";

import { evaluateCardContribution } from "../../src/scoring/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("evaluateCardContribution", () => {
  it("gives the same ramp card more value when ramp is scarce", () => {
    const scarceRampDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Ramp Spell", functionalTags: ["ramp"], basePowerRating: 6 })),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 98),
      ],
    });
    const saturatedRampDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Ramp Spell", functionalTags: ["ramp"], basePowerRating: 6 })),
        mainboardCard(createTestCard({ name: "Other Ramp", functionalTags: ["ramp"] }), 20),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 78),
      ],
    });

    const scarceContribution = evaluateCardContribution(scarceRampDeck.cards[1]!, scarceRampDeck.cards);
    const saturatedContribution = evaluateCardContribution(saturatedRampDeck.cards[1]!, saturatedRampDeck.cards);

    expect(scarceContribution.contextualValue).toBeGreaterThan(saturatedContribution.contextualValue);
    expect(scarceContribution.reasons.join(" ")).toContain("sotto soglia");
    expect(saturatedContribution.reasons.join(" ")).toContain("diminishing returns");
  });

  it("reduces value for cards without a detected role", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Vanilla Spell", basePowerRating: 6 }))],
    });

    const contribution = evaluateCardContribution(deck.cards[1]!, deck.cards);

    expect(contribution.contextualValue).toBeLessThan(contribution.baseValue);
    expect(contribution.reasons[0]).toContain("Nessun ruolo");
  });
});

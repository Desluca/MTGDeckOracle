import { describe, expect, it } from "vitest";

import { InMemoryCardRatingProvider } from "../../src/ratings/index.js";
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

  it("uses external Elo ratings as the base card value when available", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Sol Ring", functionalTags: ["ramp"], basePowerRating: 1 }))],
    });
    const ratingProvider = new InMemoryCardRatingProvider({
      "Sol Ring": 2100,
    });

    const contribution = evaluateCardContribution(deck.cards[1]!, deck.cards, undefined, { ratingProvider });

    expect(contribution.baseValue).toBe(10);
    expect(contribution.contextualValue).toBeGreaterThan(1);
  });

  it("lets a graveyard commander support a larger graveyard package", () => {
    const graveyardCommanderDeck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Graveyard Commander",
          canBeCommander: true,
          typeLine: "Legendary Creature — Wizard",
          functionalTags: ["graveyard_synergy"],
          oracleText: "Whenever one or more cards leave your graveyard, draw a card.",
        }),
      ],
      mainboard: [
        mainboardCard(createTestCard({ name: "Graveyard Payoff", functionalTags: ["graveyard_synergy"], basePowerRating: 6 }), 10),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 89),
      ],
    });
    const genericCommanderDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Graveyard Payoff", functionalTags: ["graveyard_synergy"], basePowerRating: 6 }), 10),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 89),
      ],
    });

    const graveyardContribution = evaluateCardContribution(graveyardCommanderDeck.cards[1]!, graveyardCommanderDeck.cards);
    const genericContribution = evaluateCardContribution(genericCommanderDeck.cards[1]!, genericCommanderDeck.cards);

    expect(graveyardContribution.contextualValue).toBeGreaterThan(genericContribution.contextualValue);
  });
});

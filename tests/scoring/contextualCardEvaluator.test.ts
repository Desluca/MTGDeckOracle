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

  it("lets an artifact commander support a larger artifact package", () => {
    const artifactCommanderDeck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Urza, Lord High Artificer",
          canBeCommander: true,
          typeLine: "Legendary Creature — Human Artificer",
          functionalTags: ["artifact_synergy"],
          oracleText: "Tap an untapped artifact you control: Add {C}.",
        }),
      ],
      mainboard: [
        mainboardCard(createTestCard({ name: "Artifact Payoff", functionalTags: ["artifact_synergy"], basePowerRating: 6 }), 12),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 87),
      ],
    });
    const genericCommanderDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Artifact Payoff", functionalTags: ["artifact_synergy"], basePowerRating: 6 }), 12),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 87),
      ],
    });

    const artifactContribution = evaluateCardContribution(artifactCommanderDeck.cards[1]!, artifactCommanderDeck.cards);
    const genericContribution = evaluateCardContribution(genericCommanderDeck.cards[1]!, genericCommanderDeck.cards);

    expect(artifactContribution.contextualValue).toBeGreaterThan(genericContribution.contextualValue);
  });

  it("lets a spellslinger commander support a larger instant-sorcery package", () => {
    const spellslingerDeck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Mizzix of the Izmagnus",
          canBeCommander: true,
          typeLine: "Legendary Creature — Goblin Wizard",
          oracleText: "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter.",
        }),
      ],
      mainboard: [
        mainboardCard(createTestCard({ name: "Storm Payoff", functionalTags: ["spellslinger"], basePowerRating: 6 }), 12),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 87),
      ],
    });
    const genericCommanderDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Storm Payoff", functionalTags: ["spellslinger"], basePowerRating: 6 }), 12),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 87),
      ],
    });

    const spellslingerContribution = evaluateCardContribution(spellslingerDeck.cards[1]!, spellslingerDeck.cards);
    const genericContribution = evaluateCardContribution(genericCommanderDeck.cards[1]!, genericCommanderDeck.cards);

    expect(spellslingerContribution.contextualValue).toBeGreaterThan(genericContribution.contextualValue);
  });
});

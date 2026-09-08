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
    const { themed, generic } = packageDecks({
      commanderName: "Mizzix of the Izmagnus",
      commanderOracleText: "Whenever you cast an instant or sorcery spell, you get an experience counter.",
      packageTag: "spellslinger",
      packageCount: 12,
    });

    expect(evaluateCardContribution(themed.cards[1]!, themed.cards).contextualValue).toBeGreaterThan(
      evaluateCardContribution(generic.cards[1]!, generic.cards).contextualValue,
    );
  });

  it.each([
    {
      commanderName: "Adeline, Resplendent Cathar",
      commanderOracleText: "Whenever you attack, create X 1/1 white Human creature tokens.",
      packageTag: "token_synergy" as const,
    },
    {
      commanderName: "Heliod, Sun-Crowned",
      commanderOracleText: "Lifelink. Whenever you gain life, put a +1/+1 counter on target creature.",
      packageTag: "lifegain" as const,
    },
    {
      commanderName: "Teysa, Orzhov Scion",
      commanderOracleText: "Sacrifice three white creatures: Exile target creature.",
      packageTag: "aristocrats" as const,
    },
    {
      commanderName: "Atraxa, Praetors' Voice",
      commanderOracleText: "At the beginning of your end step, proliferate.",
      packageTag: "counters_synergy" as const,
    },
    {
      commanderName: "Sythis, Harvest's Hand",
      commanderOracleText: "Enchantments you control have hexproof.",
      packageTag: "enchantment_synergy" as const,
    },
    {
      commanderName: "Ardenn, Intrepid Archaeologist",
      commanderOracleText: "You may attach any number of Equipment you control to target creature.",
      packageTag: "equipment_synergy" as const,
    },
    {
      commanderName: "Krenko, Mob Boss",
      commanderTypeLine: "Legendary Creature — Goblin Warrior",
      commanderOracleText: "Goblins you control get +1/+0.",
      commanderTags: ["tribal_synergy" as const],
      packageTag: "tribal_synergy" as const,
    },
    {
      commanderName: "Aesi, Tyrant of Gyre Strait",
      commanderOracleText: "Whenever a land you control enters, you draw a card.",
      packageTag: "landfall" as const,
    },
    {
      commanderName: "Brago, King Eternal",
      commanderOracleText: "Exile any number of target nonland permanents you control, then return those cards to the battlefield under their owner's control.",
      packageTag: "blink" as const,
    },
    {
      commanderName: "Teferi, Mage of Zhalfir",
      commanderOracleText: "Each opponent can cast spells only any time they could cast a sorcery.",
      packageTag: "counterspell" as const,
    },
  ])("lets $commanderName support a larger $packageTag package", ({ commanderName, commanderOracleText, packageTag, ...rest }) => {
    const { themed, generic } = packageDecks({
      commanderName,
      commanderOracleText,
      packageTag,
      packageCount: 12,
      ...("commanderTypeLine" in rest ? { commanderTypeLine: rest.commanderTypeLine } : {}),
      ...("commanderTags" in rest ? { commanderTags: rest.commanderTags } : {}),
    });

    expect(evaluateCardContribution(themed.cards[1]!, themed.cards).contextualValue).toBeGreaterThan(
      evaluateCardContribution(generic.cards[1]!, generic.cards).contextualValue,
    );
  });
});

function packageDecks(options: {
  readonly commanderName: string;
  readonly commanderOracleText: string;
  readonly packageTag: "token_synergy" | "lifegain" | "aristocrats" | "counters_synergy" | "enchantment_synergy" | "equipment_synergy" | "tribal_synergy" | "spellslinger" | "landfall" | "blink" | "counterspell";
  readonly packageCount: number;
  readonly commanderTypeLine?: string;
  readonly commanderTags?: readonly ("tribal_synergy")[];
}) {
  const themed = createResolvedTestDeck({
    commanders: [
      createTestCard({
        name: options.commanderName,
        canBeCommander: true,
        typeLine: options.commanderTypeLine ?? "Legendary Creature — Test",
        oracleText: options.commanderOracleText,
        functionalTags: options.commanderTags ?? [],
      }),
    ],
    mainboard: [
      mainboardCard(createTestCard({ name: "Package Payoff", functionalTags: [options.packageTag], basePowerRating: 6 }), options.packageCount),
      mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 99 - options.packageCount),
    ],
  });
  const generic = createResolvedTestDeck({
    mainboard: [
      mainboardCard(createTestCard({ name: "Package Payoff", functionalTags: [options.packageTag], basePowerRating: 6 }), options.packageCount),
      mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 99 - options.packageCount),
    ],
  });

  return { themed, generic };
}

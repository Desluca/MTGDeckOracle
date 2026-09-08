import { describe, expect, it } from "vitest";

import { InMemoryCardRatingProvider } from "../../src/ratings/index.js";
import { scoreCommanderDeck } from "../../src/scoring/index.js";
import type { CommanderLegalityReport, ComboEvaluation } from "../../src/domain/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("scoreCommanderDeck", () => {
  it("returns a complete score breakdown", () => {
    const score = scoreCommanderDeck({
      deck: createBalancedDeck(),
      legality: legalReport(),
    });

    expect(score.finalScore).toBeGreaterThan(0);
    expect(score.legalityCap).toBe(100);
    expect(score.components).toHaveLength(10);
    expect(score.components.map((component) => component.category)).toEqual([
      "legality",
      "consistency",
      "game_plan",
      "card_quality",
      "mana_base",
      "card_advantage",
      "interaction",
      "win_conditions",
      "resilience",
      "speed",
    ]);
  });

  it("respects legality caps", () => {
    const score = scoreCommanderDeck({
      deck: createBalancedDeck(),
      legality: {
        isLegal: false,
        legalityCap: 40,
        issues: [
          {
            code: "banned_card",
            severity: "blocking",
            message: "Banned card.",
          },
        ],
      },
    });

    expect(score.finalScore).toBeLessThanOrEqual(40);
    expect(score.penalties).toHaveLength(1);
  });

  it("uses combo evaluations for the win condition component", () => {
    const comboEvaluation: ComboEvaluation = {
      detectedComboId: "combo-1",
      impactScore: 92,
      speed: "instant",
      totalManaValue: 4,
      commanderRole: "piece",
      tutorAccessScore: 40,
      protectionScore: 25,
      fragilityScore: 15,
      explanation: "Compact commander combo.",
    };

    const score = scoreCommanderDeck({
      deck: createDeckWithoutWinConditions(),
      legality: legalReport(),
      comboEvaluations: [comboEvaluation],
    });

    expect(score.components.find((component) => component.category === "win_conditions")?.rawScore).toBe(92);
  });

  it("assigns brackets from final score", () => {
    const score = scoreCommanderDeck({
      deck: createBalancedDeck(),
      legality: {
        isLegal: false,
        legalityCap: 20,
        issues: [
          {
            code: "missing_commander",
            severity: "blocking",
            message: "Missing commander.",
          },
        ],
      },
    });

    expect(score.commanderBracket).toBe(1);
  });

  it("uses contextual card value for card quality", () => {
    const scarceRampScore = scoreCommanderDeck({
      deck: createRampContextDeck(1),
      legality: legalReport(),
    });
    const saturatedRampScore = scoreCommanderDeck({
      deck: createRampContextDeck(20),
      legality: legalReport(),
    });

    const scarceCardQuality = scarceRampScore.components.find((component) => component.category === "card_quality")?.rawScore;
    const saturatedCardQuality = saturatedRampScore.components.find((component) => component.category === "card_quality")?.rawScore;

    expect(scarceCardQuality).toBeGreaterThan(saturatedCardQuality ?? 0);
  });

  it("uses an external rating provider for card quality", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Premium Spell", functionalTags: ["card_draw"], basePowerRating: 1 }), 10),
        mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 89),
      ],
    });
    const withoutProvider = scoreCommanderDeck({
      deck,
      legality: legalReport(),
    });
    const withProvider = scoreCommanderDeck({
      deck,
      legality: legalReport(),
      ratingProvider: new InMemoryCardRatingProvider({
        "Premium Spell": 2100,
      }),
    });

    const withoutProviderCardQuality = withoutProvider.components.find((component) => component.category === "card_quality")?.rawScore ?? 0;
    const withProviderCardQuality = withProvider.components.find((component) => component.category === "card_quality")?.rawScore ?? 0;

    expect(withProviderCardQuality).toBeGreaterThan(withoutProviderCardQuality);
  });
});

function createBalancedDeck() {
  return createResolvedTestDeck({
    mainboard: [
      mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
      mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"], manaValue: 2 }), 10),
      mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"], manaValue: 3 }), 10),
      mainboardCard(createTestCard({ name: "Removal", functionalTags: ["spot_removal"], manaValue: 2 }), 7),
      mainboardCard(createTestCard({ name: "Protection", functionalTags: ["protection"], manaValue: 1 }), 5),
      mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"], manaValue: 4 }), 3),
    ],
  });
}

function createDeckWithoutWinConditions() {
  return createResolvedTestDeck({
    mainboard: [
      mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
      mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"], manaValue: 2 }), 10),
      mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"], manaValue: 3 }), 10),
      mainboardCard(createTestCard({ name: "Removal", functionalTags: ["spot_removal"], manaValue: 2 }), 7),
      mainboardCard(createTestCard({ name: "Protection", functionalTags: ["protection"], manaValue: 1 }), 5),
    ],
  });
}

function createRampContextDeck(rampCount: number) {
  return createResolvedTestDeck({
    mainboard: [
      mainboardCard(createTestCard({ name: "Ramp Spell", functionalTags: ["ramp"], basePowerRating: 6 }), rampCount),
      mainboardCard(createTestCard({ name: "Filler", manaValue: 3 }), 99 - rampCount),
    ],
  });
}

function legalReport(): CommanderLegalityReport {
  return {
    isLegal: true,
    legalityCap: 100,
    issues: [],
  };
}

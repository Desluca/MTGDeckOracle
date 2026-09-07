import type { CommanderLegalityReport, ComboEvaluation, DeckCard, FunctionalTag } from "../../../src/domain/index.js";
import { createTestCard } from "../../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../../utils/resolvedDeckFactory.js";
import type { ScoringBenchmark } from "./benchmarkTypes.js";

export const scoringBenchmarks: readonly ScoringBenchmark[] = [
  {
    id: "precon_core",
    description: "Precon-like deck with playable structure but limited tuning.",
    deck: createProfileDeck("precon", {
      lands: 38,
      ramp: 8,
      draw: 7,
      interaction: 5,
      protection: 2,
      winConditions: 2,
      tutors: 0,
      averageFillerManaValue: 4,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 40, max: 75 },
  },
  {
    id: "casual_tuned",
    description: "Focused casual deck with better role balance.",
    deck: createProfileDeck("casual", {
      lands: 36,
      ramp: 10,
      draw: 10,
      interaction: 8,
      protection: 4,
      winConditions: 3,
      tutors: 2,
      averageFillerManaValue: 3,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 55, max: 85 },
  },
  {
    id: "high_power",
    description: "High-power deck with strong density and a compact combo.",
    deck: createProfileDeck("high-power", {
      lands: 31,
      ramp: 16,
      draw: 14,
      interaction: 13,
      protection: 6,
      winConditions: 4,
      tutors: 6,
      averageFillerManaValue: 2,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("high-power-combo", 88)],
    expectedScoreRange: { min: 70, max: 95 },
  },
  {
    id: "cedh_like",
    description: "cEDH-like profile with high speed, tutor density and interaction.",
    deck: createProfileDeck("cedh", {
      lands: 28,
      ramp: 20,
      draw: 15,
      interaction: 16,
      protection: 8,
      winConditions: 4,
      tutors: 8,
      averageFillerManaValue: 1,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("cedh-combo", 97)],
    expectedScoreRange: { min: 78, max: 100 },
  },
  {
    id: "illegal_200_goodstuff",
    description: "Illegally inflated 200-card goodstuff deck with many strong categories.",
    deck: createProfileDeck("illegal-200", {
      mainboardSize: 199,
      lands: 80,
      ramp: 30,
      draw: 25,
      interaction: 25,
      protection: 10,
      winConditions: 10,
      tutors: 10,
      averageFillerManaValue: 2,
    }),
    legality: {
      isLegal: false,
      legalityCap: 25,
      issues: [
        {
          code: "invalid_deck_size",
          severity: "blocking",
          message: "Illegal 200-card deck without a rule exception.",
        },
      ],
    },
    expectedScoreRange: { min: 0, max: 25 },
    expectedBracket: 1,
  },
  {
    id: "whtz_200_legal",
    description: "Legal Whtz-style 200-card deck that pays consistency cost but is not capped by legality.",
    deck: createProfileDeck("whtz", {
      mainboardSize: 199,
      lands: 80,
      ramp: 25,
      draw: 35,
      interaction: 20,
      protection: 10,
      winConditions: 5,
      tutors: 15,
      averageFillerManaValue: 2,
      commanderName: "Whtz, the Bibliophile",
      commanderOracleText: "Rulebreaker — A deck with this commander has no maximum deck size.",
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("battle-of-wits-line", 82)],
    expectedScoreRange: { min: 45, max: 90 },
  },
  {
    id: "combo_fragments",
    description: "Deck with combo fragments but weak ability to close games.",
    deck: createProfileDeck("fragments", {
      lands: 37,
      ramp: 7,
      draw: 6,
      interaction: 5,
      protection: 1,
      winConditions: 0,
      tutors: 0,
      averageFillerManaValue: 4,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("partial-combo", 25)],
    expectedScoreRange: { min: 25, max: 70 },
  },
  {
    id: "bad_mana_base",
    description: "Deck with too few lands and a high curve.",
    deck: createProfileDeck("bad-mana", {
      lands: 20,
      ramp: 3,
      draw: 5,
      interaction: 4,
      protection: 1,
      winConditions: 2,
      tutors: 0,
      averageFillerManaValue: 6,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 15, max: 60 },
  },
];

interface ProfileDeckOptions {
  readonly mainboardSize?: number;
  readonly lands: number;
  readonly ramp: number;
  readonly draw: number;
  readonly interaction: number;
  readonly protection: number;
  readonly winConditions: number;
  readonly tutors: number;
  readonly averageFillerManaValue: number;
  readonly commanderName?: string;
  readonly commanderOracleText?: string;
}

function createProfileDeck(id: string, options: ProfileDeckOptions) {
  const mainboardSize = options.mainboardSize ?? 99;
  const mainboard: DeckCard[] = [
    quantityCard(`${id} Land`, options.lands, [], 0, true),
    quantityCard(`${id} Ramp`, options.ramp, ["ramp"], 2),
    quantityCard(`${id} Draw`, options.draw, ["card_draw"], 3),
    quantityCard(`${id} Interaction`, options.interaction, ["spot_removal"], 2),
    quantityCard(`${id} Protection`, options.protection, ["protection"], 1),
    quantityCard(`${id} Win`, options.winConditions, ["win_condition"], 4),
    quantityCard(`${id} Tutor`, options.tutors, ["tutor"], 2),
  ].filter((deckCard) => deckCard.quantity > 0);
  const usedCards = mainboard.reduce((total, deckCard) => total + deckCard.quantity, 0);
  const fillerCount = Math.max(0, mainboardSize - usedCards);

  if (fillerCount > 0) {
    mainboard.push(quantityCard(`${id} Filler`, fillerCount, [], options.averageFillerManaValue));
  }

  return createResolvedTestDeck({
    commanders: [
      createTestCard({
        name: options.commanderName ?? `${id} Commander`,
        colorIdentity: ["W", "U"],
        canBeCommander: true,
        manaValue: 3,
        ...(options.commanderOracleText ? { oracleText: options.commanderOracleText } : {}),
      }),
    ],
    mainboard,
  });
}

function quantityCard(
  name: string,
  quantity: number,
  functionalTags: readonly FunctionalTag[],
  manaValue: number,
  isLand = false,
): DeckCard {
  return mainboardCard(
    createTestCard({
      name,
      functionalTags,
      manaValue,
      types: isLand ? ["land"] : ["instant"],
      typeLine: isLand ? "Basic Land — Test" : "Instant",
    }),
    quantity,
  );
}

function legalReport(): CommanderLegalityReport {
  return {
    isLegal: true,
    legalityCap: 100,
    issues: [],
  };
}

function comboEvaluation(id: string, impactScore: number): ComboEvaluation {
  return {
    detectedComboId: id,
    impactScore,
    speed: "sorcery",
    totalManaValue: 4,
    commanderRole: "none",
    tutorAccessScore: 30,
    protectionScore: 20,
    fragilityScore: 25,
    explanation: "Benchmark combo evaluation.",
  };
}

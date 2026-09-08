import type { CommanderLegalityReport, ComboEvaluation, DeckCard, DetectedCombo, FunctionalTag } from "../../../src/domain/index.js";
import { createTestCard } from "../../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../../utils/resolvedDeckFactory.js";
import type { ScoringBenchmark } from "./benchmarkTypes.js";
import { loadRealDeckBenchmark } from "./loadFixtureDeck.js";

export const scoringBenchmarks: readonly ScoringBenchmark[] = [
  {
    id: "precon_core",
    description: "Pantlaza-like precon: playable structure, many unfocused cards, low power ratings.",
    deck: createProfileDeck({
      commanderName: "Pantlaza, Sun-Blessed",
      lands: 38,
      ramp: 8,
      draw: 7,
      interaction: 5,
      protection: 2,
      winConditions: 2,
      tutors: 0,
      averageFillerManaValue: 4,
      functionalPowerRating: 4,
      fillerPowerRating: 3,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 45, max: 68 },
    expectedBracket: 2,
  },
  {
    id: "casual_tuned",
    description: "Muldrotha casual tuned: balanced roles, graveyard commander, mid power ratings.",
    deck: createProfileDeck({
      commanderName: "Muldrotha, the Gravetide",
      commanderOracleText: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard.",
      commanderTags: ["graveyard_synergy", "recursion"],
      lands: 36,
      ramp: 10,
      draw: 10,
      interaction: 8,
      protection: 4,
      winConditions: 3,
      tutors: 2,
      averageFillerManaValue: 3,
      functionalPowerRating: 6,
      fillerPowerRating: 4,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 62, max: 82 },
    expectedBracket: 2,
  },
  {
    id: "high_power",
    description: "Kinnan high-power: dense ramp/draw, compact combo, strong card quality.",
    deck: createProfileDeck({
      commanderName: "Kinnan, Bonder Prodigy",
      commanderTags: ["ramp", "value_engine"],
      lands: 32,
      ramp: 16,
      draw: 12,
      interaction: 11,
      protection: 6,
      winConditions: 4,
      tutors: 5,
      averageFillerManaValue: 2,
      functionalPowerRating: 8,
      fillerPowerRating: 5,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("high-power-combo", 88)],
    detectedCombos: [twoCardWinCombo("high-power-combo", 4)],
    expectedScoreRange: { min: 78, max: 91 },
    expectedBracket: 4,
  },
  {
    id: "cedh_like",
    description: "Thrasios cEDH-like: fast mana, tutors, interaction and a compact win.",
    deck: createProfileDeck({
      commanderName: "Thrasios, Triton Hero",
      commanderTags: ["card_draw", "ramp"],
      lands: 28,
      ramp: 18,
      draw: 14,
      interaction: 15,
      protection: 7,
      winConditions: 4,
      tutors: 8,
      averageFillerManaValue: 1,
      functionalPowerRating: 9.5,
      fillerPowerRating: 7,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("cedh-combo", 97, "instant")],
    detectedCombos: [twoCardWinCombo("cedh-combo", 3)],
    expectedScoreRange: { min: 86, max: 100 },
    expectedBracket: 5,
  },
  {
    id: "illegal_200_goodstuff",
    description: "Illegally inflated 200-card Kenrith goodstuff pile.",
    deck: createProfileDeck({
      commanderName: "Kenrith, the Returned King",
      mainboardSize: 199,
      lands: 80,
      ramp: 30,
      draw: 25,
      interaction: 25,
      protection: 10,
      winConditions: 10,
      tutors: 10,
      averageFillerManaValue: 2,
      functionalPowerRating: 8,
      fillerPowerRating: 5,
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
    description: "Legal Whtz-style 200-card deck: no legality cap, but consistency still suffers.",
    deck: createProfileDeck({
      commanderName: "Whtz, the Bibliophile",
      commanderOracleText: "Rulebreaker — A deck with this commander has no maximum deck size.",
      mainboardSize: 199,
      lands: 80,
      ramp: 25,
      draw: 35,
      interaction: 20,
      protection: 10,
      winConditions: 5,
      tutors: 15,
      averageFillerManaValue: 2,
      functionalPowerRating: 7,
      fillerPowerRating: 5,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("battle-of-wits-line", 82)],
    expectedScoreRange: { min: 55, max: 82 },
    expectedBracket: 2,
  },
  {
    id: "combo_fragments",
    description: "Kess list with a partial combo and no way to reliably close.",
    deck: createProfileDeck({
      commanderName: "Kess, Dissident Mage",
      lands: 37,
      ramp: 7,
      draw: 6,
      interaction: 5,
      protection: 1,
      winConditions: 0,
      tutors: 0,
      averageFillerManaValue: 4,
      functionalPowerRating: 5,
      fillerPowerRating: 3,
    }),
    legality: legalReport(),
    comboEvaluations: [comboEvaluation("partial-combo", 25)],
    expectedScoreRange: { min: 38, max: 62 },
    expectedBracket: 2,
  },
  {
    id: "bad_mana_base",
    description: "Gishath list with too few lands and a high curve.",
    deck: createProfileDeck({
      commanderName: "Gishath, Sun's Avatar",
      lands: 20,
      ramp: 3,
      draw: 5,
      interaction: 4,
      protection: 1,
      winConditions: 2,
      tutors: 0,
      averageFillerManaValue: 6,
      functionalPowerRating: 5,
      fillerPowerRating: 3,
    }),
    legality: legalReport(),
    expectedScoreRange: { min: 28, max: 55 },
    expectedBracket: 2,
  },
  {
    id: "illegal_color_identity",
    description: "Atraxa list with a red card outside the commander's color identity.",
    deck: createProfileDeck({
      commanderName: "Atraxa, Praetors' Voice",
      lands: 36,
      ramp: 10,
      draw: 9,
      interaction: 8,
      protection: 3,
      winConditions: 3,
      tutors: 2,
      averageFillerManaValue: 3,
      functionalPowerRating: 6,
      fillerPowerRating: 4,
    }),
    legality: {
      isLegal: false,
      legalityCap: 40,
      issues: [
        {
          code: "color_identity_violation",
          severity: "blocking",
          cardName: "Lightning Bolt",
          message: "Lightning Bolt is outside Atraxa's color identity.",
        },
      ],
    },
    expectedScoreRange: { min: 0, max: 40 },
    expectedBracket: 2,
  },
  loadRealDeckBenchmark(
    "real_pantlaza_precon",
    "pantlaza-precon.deck",
    "Real Pantlaza dinosaur list tagged from oracle text.",
    { min: 70, max: 85 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_muldrotha_casual",
    "muldrotha-casual.deck",
    "Real Muldrotha graveyard list tagged from oracle text.",
    { min: 78, max: 90 },
    3,
  ),
  loadRealDeckBenchmark(
    "real_kinnan_high_power",
    "kinnan-high-power.deck",
    "Real Kinnan high-power list with a compact Spellbook combo.",
    { min: 86, max: 93 },
    4,
  ),
  loadRealDeckBenchmark(
    "real_thrasios_cedh",
    "thrasios-tymna-cedh.deck",
    "Real Thrasios/Tymna cEDH list with Thoracle lines.",
    { min: 91, max: 98 },
    5,
  ),
  loadRealDeckBenchmark(
    "real_gishath_bad_mana",
    "gishath-bad-mana.deck",
    "Real Gishath list with too few lands and a high curve.",
    { min: 70, max: 82 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_whtz_120",
    "whtz-120.deck",
    "Legal Whtz 120-card list: no legality cap, consistency still suffers.",
    { min: 45, max: 62 },
    4,
  ),
  loadRealDeckBenchmark(
    "real_kinnan_illegal_size",
    "kinnan-illegal-size.deck",
    "Kinnan list illegally at 101 cards.",
    { min: 0, max: 70 },
    4,
  ),
  loadRealDeckBenchmark(
    "real_pantlaza_illegal_color",
    "pantlaza-illegal-color.deck",
    "Pantlaza list with Counterspell outside Naya identity.",
    { min: 0, max: 40 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_pantlaza_precon_modded",
    "pantlaza-precon-modded.deck",
    "Pantlaza precon with efficient ramp and draw swaps, still no Game Changers.",
    { min: 72, max: 88 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_kess_spellslinger",
    "kess-spellslinger.deck",
    "Real Kess spellslinger list with Breach and Dualcaster lines.",
    { min: 80, max: 91 },
    4,
  ),
  loadRealDeckBenchmark(
    "real_grand_arbiter_stax",
    "grand-arbiter-stax.deck",
    "Real Grand Arbiter stax list with a few Game Changers and no early two-card infinite.",
    { min: 74, max: 88 },
    3,
  ),
  loadRealDeckBenchmark(
    "real_light_paws_voltron",
    "light-paws-voltron.deck",
    "Real Light-Paws aura voltron list with no Game Changers.",
    { min: 70, max: 86 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_rhys_tokens",
    "rhys-tokens.deck",
    "Real Rhys token list with doublers and a combat payoff.",
    { min: 74, max: 88 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_urza_artifacts",
    "urza-artifacts.deck",
    "Real Urza artifact list with Isochron and a dense rock package.",
    { min: 86, max: 93 },
    4,
  ),
  loadRealDeckBenchmark(
    "real_sythis_enchantress",
    "sythis-enchantress.deck",
    "Real Sythis enchantress list with no Game Changers.",
    { min: 70, max: 86 },
    2,
  ),
  loadRealDeckBenchmark(
    "real_teysa_aristocrats",
    "teysa-aristocrats.deck",
    "Real Teysa aristocrats list with a few Game Changers and a drain package.",
    { min: 70, max: 86 },
    3,
  ),
  loadRealDeckBenchmark(
    "real_aesi_landfall",
    "aesi-landfall.deck",
    "Real Aesi landfall list with extra land drops and landfall payoffs.",
    { min: 70, max: 86 },
    3,
  ),
  loadRealDeckBenchmark(
    "real_brago_blink",
    "brago-blink.deck",
    "Real Brago blink list with ETB value and flicker payoffs.",
    { min: 70, max: 86 },
    3,
  ),
  loadRealDeckBenchmark(
    "real_teferi_control",
    "teferi-control.deck",
    "Real Teferi control list with counters, Game Changers, and Isochron.",
    { min: 80, max: 92 },
    4,
  ),
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
  readonly commanderTags?: readonly FunctionalTag[];
  readonly functionalPowerRating?: number;
  readonly fillerPowerRating?: number;
}

function createProfileDeck(options: ProfileDeckOptions) {
  const mainboardSize = options.mainboardSize ?? 99;
  const functionalPowerRating = options.functionalPowerRating ?? 5;
  const fillerPowerRating = options.fillerPowerRating ?? 3;
  const prefix = options.commanderName ?? "Benchmark";
  const mainboard: DeckCard[] = [
    quantityCard(`${prefix} Land`, options.lands, [], 0, true),
    quantityCard(`${prefix} Ramp`, options.ramp, ["ramp"], 2, false, functionalPowerRating),
    quantityCard(`${prefix} Draw`, options.draw, ["card_draw"], 3, false, functionalPowerRating),
    quantityCard(`${prefix} Interaction`, options.interaction, ["spot_removal"], 2, false, functionalPowerRating),
    quantityCard(`${prefix} Protection`, options.protection, ["protection"], 1, false, functionalPowerRating),
    quantityCard(`${prefix} Win`, options.winConditions, ["win_condition"], 4, false, functionalPowerRating),
    quantityCard(`${prefix} Tutor`, options.tutors, ["tutor"], 2, false, functionalPowerRating),
  ].filter((deckCard) => deckCard.quantity > 0);
  const usedCards = mainboard.reduce((total, deckCard) => total + deckCard.quantity, 0);
  const fillerCount = Math.max(0, mainboardSize - usedCards);

  if (fillerCount > 0) {
    mainboard.push(quantityCard(`${prefix} Filler`, fillerCount, [], options.averageFillerManaValue, false, fillerPowerRating));
  }

  return createResolvedTestDeck({
    commanders: [
      createTestCard({
        name: options.commanderName ?? `${prefix} Commander`,
        colorIdentity: ["W", "U"],
        canBeCommander: true,
        manaValue: 3,
        functionalTags: options.commanderTags ?? [],
        basePowerRating: functionalPowerRating,
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
  basePowerRating?: number,
): DeckCard {
  return mainboardCard(
    createTestCard({
      name,
      functionalTags,
      manaValue,
      types: isLand ? ["land"] : ["instant"],
      typeLine: isLand ? "Basic Land — Test" : "Instant",
      ...(basePowerRating !== undefined ? { basePowerRating } : {}),
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

function comboEvaluation(id: string, impactScore: number, speed: ComboEvaluation["speed"] = "sorcery"): ComboEvaluation {
  return {
    detectedComboId: id,
    impactScore,
    speed,
    totalManaValue: 4,
    commanderRole: "none",
    tutorAccessScore: 30,
    protectionScore: 20,
    fragilityScore: 25,
    explanation: "Benchmark combo evaluation.",
  };
}

function twoCardWinCombo(id: string, estimatedClosingTurnMana: number): DetectedCombo {
  return {
    combo: {
      id,
      name: id,
      source: "manual",
      pieces: [
        { cardName: "Combo Piece A", required: true },
        { cardName: "Combo Piece B", required: true },
      ],
      outcomes: ["wins_game"],
      estimatedClosingTurnMana,
    },
    completeness: "complete",
    presentPieces: ["Combo Piece A", "Combo Piece B"],
    missingPieces: [],
  };
}

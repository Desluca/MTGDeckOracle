import type { ConsistencySignal, DeckCard, DeckList, FunctionalTag } from "../domain/index.js";
import { consistencyMultiplier, hypergeometricAtLeastOne } from "../probability/index.js";

export interface ConsistencyAnalysis {
  readonly deckSize: number;
  readonly librarySize: number;
  readonly sizeMultiplier: number;
  readonly redundancyScore: number;
  readonly signals: readonly ConsistencySignal[];
  readonly score: number;
}

const DEFAULT_DRAWS_BY_TURN_THREE = 10;
const DEFAULT_DRAWS_BY_TURN_FIVE = 12;
const COMMANDER_ACCESS = 0.65;
const EARLY_COMMANDER_ACCESS = COMMANDER_ACCESS * 0.7;
const ACCESS_WEIGHT = 0.8;
const REDUNDANCY_WEIGHT = 0.2;
const MAX_COMMAND_ZONE_CARDS = 2;

export function analyzeConsistency(deck: DeckList, baselineDeckSize = 100): ConsistencyAnalysis {
  const libraryCards = deck.cards.filter((deckCard) => deckCard.section === "mainboard");
  const commanders = deck.cards.filter((deckCard) => deckCard.section === "commander");
  const librarySize = countCards(libraryCards);
  const commanderCount = countCards(commanders);
  const deckSize = librarySize + commanderCount;
  const sizeMultiplier = consistencyMultiplier(librarySize, expectedLibrarySize(baselineDeckSize, commanderCount));
  const signals = [
    createSignal(
      "early_land_access",
      "Probabilita' di vedere almeno una terra entro il turno 3.",
      librarySize,
      countLands(libraryCards),
      DEFAULT_DRAWS_BY_TURN_THREE,
    ),
    createSignal(
      "early_ramp_access",
      "Probabilita' di vedere ramp o fast mana entro il turno 3.",
      librarySize,
      countTagged(libraryCards, ["ramp", "fast_mana"]),
      DEFAULT_DRAWS_BY_TURN_THREE,
      commanderProvides(commanders, ["ramp", "fast_mana"]) ? EARLY_COMMANDER_ACCESS : 0,
    ),
    createSignal(
      "card_advantage_access",
      "Probabilita' di vedere draw, selezione o tutor entro il turno 5.",
      librarySize,
      countTagged(libraryCards, ["card_draw", "card_selection", "tutor"]),
      DEFAULT_DRAWS_BY_TURN_FIVE,
      commanderProvides(commanders, ["card_draw", "card_selection", "tutor"]) ? COMMANDER_ACCESS : 0,
    ),
    createSignal(
      "interaction_access",
      "Probabilita' di vedere removal, wipe o counter entro il turno 5.",
      librarySize,
      countTagged(libraryCards, ["spot_removal", "board_wipe", "counterspell"]),
      DEFAULT_DRAWS_BY_TURN_FIVE,
      commanderProvides(commanders, ["spot_removal", "board_wipe", "counterspell"]) ? COMMANDER_ACCESS : 0,
    ),
    createSignal(
      "tutor_access",
      "Probabilita' di vedere un tutor entro il turno 5.",
      librarySize,
      countTagged(libraryCards, ["tutor"]),
      DEFAULT_DRAWS_BY_TURN_FIVE,
      commanderProvides(commanders, ["tutor"]) ? COMMANDER_ACCESS : 0,
    ),
    createSignal(
      "win_condition_access",
      "Probabilita' di accedere a una win condition, anche tramite tutor.",
      librarySize,
      countWinAccess(libraryCards),
      DEFAULT_DRAWS_BY_TURN_FIVE,
      commanderProvides(commanders, ["win_condition", "combo_payoff", "combo_piece"]) ? COMMANDER_ACCESS : 0,
    ),
  ];
  const redundancyScore = calculateRedundancyScore(libraryCards);
  const averageProbability = signals.reduce((total, signal) => total + signal.probability, 0) / signals.length;
  const combinedScore = averageProbability * ACCESS_WEIGHT + redundancyScore * REDUNDANCY_WEIGHT;

  return {
    deckSize,
    librarySize,
    sizeMultiplier,
    redundancyScore,
    signals,
    score: Math.round(combinedScore * sizeMultiplier * 100),
  };
}

function createSignal(
  name: string,
  explanation: string,
  librarySize: number,
  successCount: number,
  drawCount: number,
  commanderAvailability = 0,
): ConsistencySignal {
  const libraryProbability = hypergeometricAtLeastOne(librarySize, successCount, drawCount);
  const probability = roundProbability(combineAccess(libraryProbability, commanderAvailability));

  return {
    name,
    probability,
    explanation,
  };
}

function combineAccess(libraryProbability: number, commanderAvailability: number): number {
  return 1 - (1 - libraryProbability) * (1 - Math.max(0, Math.min(1, commanderAvailability)));
}

function countWinAccess(libraryCards: readonly DeckCard[]): number {
  const winCount = countTagged(libraryCards, ["win_condition", "combo_payoff"]);
  if (winCount === 0) {
    return 0;
  }

  return countTagged(libraryCards, ["win_condition", "combo_payoff", "tutor"]);
}

function calculateRedundancyScore(libraryCards: readonly DeckCard[]): number {
  const roles: readonly { readonly tags: readonly FunctionalTag[]; readonly ideal: number }[] = [
    { tags: ["ramp", "fast_mana"], ideal: 8 },
    { tags: ["card_draw", "card_selection"], ideal: 8 },
    { tags: ["spot_removal", "board_wipe", "counterspell"], ideal: 7 },
    { tags: ["win_condition", "combo_payoff", "tutor"], ideal: 4 },
  ];
  const scores = roles.map((role) => Math.min(1, countTagged(libraryCards, role.tags) / role.ideal));
  return roundProbability(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function expectedLibrarySize(baselineDeckSize: number, commanderCount: number): number {
  const commandZoneCards = Math.min(commanderCount, MAX_COMMAND_ZONE_CARDS);
  return Math.max(1, baselineDeckSize - commandZoneCards);
}

function commanderProvides(commanders: readonly DeckCard[], tags: readonly FunctionalTag[]): boolean {
  return commanders.some((deckCard) => tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag)));
}

function countCards(cards: readonly DeckCard[]): number {
  return cards.reduce((total, deckCard) => total + deckCard.quantity, 0);
}

function countLands(cards: readonly DeckCard[]): number {
  return countCards(cards.filter((deckCard) => deckCard.card.rules.types.includes("land")));
}

function countTagged(cards: readonly DeckCard[], tags: readonly FunctionalTag[]): number {
  return cards.reduce((total, deckCard) => {
    const hasTag = tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag));
    return total + (hasTag ? deckCard.quantity : 0);
  }, 0);
}

function roundProbability(probability: number): number {
  return Math.round(probability * 10_000) / 10_000;
}

import type { ConsistencySignal, DeckCard, DeckList, FunctionalTag } from "../domain/index.js";
import { consistencyMultiplier, hypergeometricAtLeastOne } from "../probability/index.js";

export interface ConsistencyAnalysis {
  readonly deckSize: number;
  readonly sizeMultiplier: number;
  readonly signals: readonly ConsistencySignal[];
  readonly score: number;
}

const DEFAULT_DRAWS_BY_TURN_THREE = 10;
const DEFAULT_DRAWS_BY_TURN_FIVE = 12;

export function analyzeConsistency(deck: DeckList, baselineDeckSize = 100): ConsistencyAnalysis {
  const commanderDeckCards = deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
  const deckSize = countCards(commanderDeckCards);
  const sizeMultiplier = consistencyMultiplier(deckSize, baselineDeckSize);
  const signals = [
    createSignal("early_land_access", "Probabilita' di vedere almeno una terra entro il turno 3.", deckSize, countLands(commanderDeckCards), DEFAULT_DRAWS_BY_TURN_THREE),
    createSignal("early_ramp_access", "Probabilita' di vedere ramp o fast mana entro il turno 3.", deckSize, countTagged(commanderDeckCards, ["ramp", "fast_mana"]), DEFAULT_DRAWS_BY_TURN_THREE),
    createSignal("card_advantage_access", "Probabilita' di vedere draw/card advantage entro il turno 5.", deckSize, countTagged(commanderDeckCards, ["card_draw", "card_selection"]), DEFAULT_DRAWS_BY_TURN_FIVE),
    createSignal("win_condition_access", "Probabilita' di vedere una win condition entro il turno 5.", deckSize, countTagged(commanderDeckCards, ["win_condition", "combo_payoff"]), DEFAULT_DRAWS_BY_TURN_FIVE),
  ];

  const averageProbability = signals.reduce((total, signal) => total + signal.probability, 0) / signals.length;

  return {
    deckSize,
    sizeMultiplier,
    signals,
    score: Math.round(averageProbability * sizeMultiplier * 100),
  };
}

function createSignal(
  name: string,
  explanation: string,
  deckSize: number,
  successCount: number,
  drawCount: number,
): ConsistencySignal {
  return {
    name,
    probability: roundProbability(hypergeometricAtLeastOne(deckSize, successCount, drawCount)),
    explanation,
  };
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

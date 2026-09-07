import type {
  CommanderBracket,
  CommanderLegalityReport,
  DeckList,
  FunctionalTag,
  ScoreBreakdown,
  ScoreCategory,
  ScoreComponent,
  ScorePenalty,
  ScoringWeights,
} from "../domain/index.js";
import { defaultScoringWeights } from "../domain/index.js";
import type { ComboEvaluation } from "../domain/index.js";
import { analyzeDeckStructure } from "../analysis/index.js";
import type { ConsistencyAnalysis } from "../consistency/index.js";
import { analyzeConsistency } from "../consistency/index.js";
import { evaluateCardContribution } from "./contextualCardEvaluator.js";

export interface ScoreCommanderDeckInput {
  readonly deck: DeckList;
  readonly legality: CommanderLegalityReport;
  readonly comboEvaluations?: readonly ComboEvaluation[];
  readonly consistency?: ConsistencyAnalysis;
  readonly weights?: ScoringWeights;
}

export function scoreCommanderDeck(input: ScoreCommanderDeckInput): ScoreBreakdown {
  const weights = input.weights ?? defaultScoringWeights;
  const structure = analyzeDeckStructure(input.deck);
  const consistency = input.consistency ?? analyzeConsistency(input.deck);
  const roleCount = (tags: readonly FunctionalTag[]) => getRoleCount(input.deck, tags);
  const comboEvaluations = input.comboEvaluations ?? [];

  const components: ScoreComponent[] = [
    component("legality", "Legalita' e struttura", input.legality.legalityCap, weights.legality, explainLegality(input.legality)),
    component("consistency", "Consistenza", consistency.score, weights.consistency, "Probabilita' di accedere a terre, ramp, draw e win condition."),
    component("game_plan", "Piano di gioco", scoreGamePlan(roleCount), weights.gamePlan, "Premia densita' di carte con ruoli funzionali chiari."),
    component("card_quality", "Qualita' carte", scoreCardQuality(input.deck), weights.cardQuality, "Media dei rating carta disponibili, con default neutro."),
    component("mana_base", "Mana base", scoreManaBase(structure.composition.landCount, structure.composition.totalCards), weights.manaBase, "Valuta il numero di terre rispetto alla dimensione del mazzo."),
    component("card_advantage", "Card advantage", scoreDensity(roleCount(["card_draw", "card_selection"]), structure.composition.totalCards, 10), weights.cardAdvantage, "Valuta draw e selezione carte."),
    component("interaction", "Interaction", scoreDensity(roleCount(["spot_removal", "board_wipe", "counterspell", "graveyard_hate"]), structure.composition.totalCards, 9), weights.interaction, "Valuta risposte a minacce e combo."),
    component("win_conditions", "Win condition e combo", scoreWinConditions(input.deck, comboEvaluations), weights.winConditions, "Combina win condition esplicite e impatto combo."),
    component("resilience", "Resilienza", scoreDensity(roleCount(["protection", "recursion"]), structure.composition.totalCards, 6), weights.resilience, "Valuta protezioni e recursion."),
    component("speed", "Velocita'", scoreSpeed(roleCount(["ramp", "fast_mana"]), structure.composition.totalCards, structure.composition.averageManaValue), weights.speed, "Valuta accelerazione e curva."),
  ];
  const penalties = createPenalties(input.legality);
  const weightedScore = components.reduce((total, item) => total + item.weightedScore, 0);
  const penaltyPoints = penalties.reduce((total, penalty) => total + penalty.points, 0);
  const finalScore = clampScore(Math.min(input.legality.legalityCap, weightedScore) - penaltyPoints);

  return {
    finalScore,
    commanderBracket: bracketFromScore(finalScore),
    legalityCap: input.legality.legalityCap,
    components,
    penalties,
    explanation: explainFinalScore(finalScore, input.legality.legalityCap, penalties),
  };
}

function component(
  category: ScoreCategory,
  label: string,
  rawScore: number,
  weight: number,
  explanation: string,
): ScoreComponent {
  const clampedRawScore = clampScore(rawScore);

  return {
    category,
    label,
    rawScore: clampedRawScore,
    weightedScore: Math.round((clampedRawScore / 100) * weight * 100) / 100,
    weight,
    explanation,
  };
}

function getRoleCount(deck: DeckList, tags: readonly FunctionalTag[]): number {
  return commanderDeckCards(deck).reduce((total, deckCard) => {
    const hasTag = tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag));
    return total + (hasTag ? deckCard.quantity : 0);
  }, 0);
}

function scoreGamePlan(roleCount: (tags: readonly FunctionalTag[]) => number): number {
  const proactive = roleCount(["ramp", "card_draw", "tutor", "win_condition", "combo_piece", "combo_payoff"]);
  const reactive = roleCount(["spot_removal", "board_wipe", "counterspell", "protection"]);
  return clampScore(35 + proactive * 3 + reactive * 2);
}

function scoreCardQuality(deck: DeckList): number {
  const deckCards = commanderDeckCards(deck).filter((deckCard) => !deckCard.card.rules.types.includes("land"));
  const deckSize = deckCards.reduce((total, deckCard) => total + deckCard.quantity, 0);

  if (deckSize === 0) {
    return 0;
  }

  const totalContextualValue = deckCards.reduce((total, deckCard) => {
    const contribution = evaluateCardContribution(deckCard, deckCards, deckSize);
    return total + contribution.contextualValue * deckCard.quantity;
  }, 0);

  return clampScore((totalContextualValue / deckSize) * 10);
}

function scoreManaBase(landCount: number, deckSize: number): number {
  if (deckSize <= 0) {
    return 0;
  }

  const landRatio = landCount / deckSize;
  const idealRatio = 37 / 100;
  return clampScore(100 - Math.abs(landRatio - idealRatio) * 280);
}

function scoreDensity(count: number, deckSize: number, idealPerHundred: number): number {
  if (deckSize <= 0) {
    return 0;
  }

  const normalizedCount = (count / deckSize) * 100;
  return clampScore((normalizedCount / idealPerHundred) * 100);
}

function scoreWinConditions(deck: DeckList, comboEvaluations: readonly ComboEvaluation[]): number {
  const explicitWinConditions = getRoleCount(deck, ["win_condition", "combo_payoff"]);
  const deckSize = commanderDeckCards(deck).reduce((total, deckCard) => total + deckCard.quantity, 0);
  const densityScore = scoreDensity(explicitWinConditions, deckSize, 4);
  const comboScore = comboEvaluations.length > 0 ? Math.max(...comboEvaluations.map((combo) => combo.impactScore)) : 0;

  return Math.max(densityScore, comboScore);
}

function commanderDeckCards(deck: DeckList) {
  return deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
}

function scoreSpeed(rampCount: number, deckSize: number, averageManaValue: number): number {
  const rampScore = scoreDensity(rampCount, deckSize, 10);
  const curveScore = clampScore(100 - Math.max(0, averageManaValue - 2.5) * 25);
  return Math.round((rampScore * 0.65 + curveScore * 0.35) * 100) / 100;
}

function createPenalties(legality: CommanderLegalityReport): readonly ScorePenalty[] {
  return legality.issues
    .filter((issue) => issue.severity === "error" || issue.severity === "blocking")
    .map((issue) => ({
      code: issue.code,
      label: issue.cardName ? `${issue.code}: ${issue.cardName}` : issue.code,
      points: issue.severity === "blocking" ? 8 : 3,
      explanation: issue.message,
    }));
}

function explainLegality(legality: CommanderLegalityReport): string {
  if (legality.isLegal) {
    return "Il mazzo rispetta i vincoli di legalita' noti.";
  }

  return `Il mazzo ha ${legality.issues.length} issue e un cap di legalita' pari a ${legality.legalityCap}.`;
}

function explainFinalScore(score: number, legalityCap: number, penalties: readonly ScorePenalty[]): string {
  if (penalties.length === 0 && legalityCap === 100) {
    return `Il mazzo ottiene ${score}/100 sulla base dei sottopunteggi analizzati.`;
  }

  return `Il mazzo ottiene ${score}/100 dopo penalita' e cap di legalita' ${legalityCap}.`;
}

function bracketFromScore(score: number): CommanderBracket {
  if (score <= 20) {
    return 1;
  }

  if (score <= 40) {
    return 2;
  }

  if (score <= 75) {
    return 3;
  }

  if (score <= 88) {
    return 4;
  }

  return 5;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

import type { DeckStructureSummary } from "../analysis/index.js";
import type { ConsistencyAnalysis } from "../consistency/index.js";
import type { ComboEvaluation, CommanderLegalityReport, ScoreBreakdown } from "../domain/index.js";

export interface DeckScoreExplanation {
  readonly summary: string;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
}

export interface GenerateExplanationInput {
  readonly score: ScoreBreakdown;
  readonly legality: CommanderLegalityReport;
  readonly structure: DeckStructureSummary;
  readonly consistency: ConsistencyAnalysis;
  readonly comboEvaluations?: readonly ComboEvaluation[];
}

export function generateDeckScoreExplanation(input: GenerateExplanationInput): DeckScoreExplanation {
  const strengths = findStrengths(input);
  const weaknesses = findWeaknesses(input);
  const recommendations = findRecommendations(input);

  return {
    summary: createSummary(input),
    strengths,
    weaknesses,
    recommendations,
  };
}

function createSummary(input: GenerateExplanationInput): string {
  const legalityText = input.legality.isLegal ? "Il mazzo risulta legale rispetto ai controlli disponibili" : "Il mazzo ha problemi di legalita' o struttura";
  return `${legalityText} e ottiene ${input.score.finalScore}/100, con bracket stimato ${input.score.commanderBracket}.`;
}

function findStrengths(input: GenerateExplanationInput): readonly string[] {
  const strengths: string[] = [];
  const topComponents = [...input.score.components].sort((left, right) => right.rawScore - left.rawScore).slice(0, 3);

  for (const component of topComponents) {
    if (component.rawScore >= 70) {
      strengths.push(`${component.label}: ${component.rawScore}/100.`);
    }
  }

  const bestCombo = bestComboEvaluation(input.comboEvaluations ?? []);
  if (bestCombo && bestCombo.impactScore >= 75) {
    strengths.push(`Combo rilevante: impatto ${bestCombo.impactScore}/100, ruolo comandante ${bestCombo.commanderRole}.`);
  }

  return strengths;
}

function findWeaknesses(input: GenerateExplanationInput): readonly string[] {
  const weaknesses: string[] = [];

  if (!input.legality.isLegal) {
    weaknesses.push(`Legalita': cap ${input.legality.legalityCap}/100 con ${input.legality.issues.length} issue.`);
  }

  for (const component of input.score.components) {
    if (component.rawScore <= 45) {
      weaknesses.push(`${component.label}: ${component.rawScore}/100.`);
    }
  }

  if (input.consistency.sizeMultiplier < 0.8) {
    weaknesses.push(`Consistenza ridotta dalla dimensione del mazzo: moltiplicatore ${input.consistency.sizeMultiplier.toFixed(2)}.`);
  }

  return weaknesses;
}

function findRecommendations(input: GenerateExplanationInput): readonly string[] {
  const recommendations: string[] = [];

  if (!input.legality.isLegal) {
    recommendations.push("Correggere prima gli errori di legalita' o struttura: finche' restano, il voto e' limitato.");
  }

  const lowComponents = [...input.score.components].filter((component) => component.rawScore <= 55);
  for (const component of lowComponents.slice(0, 3)) {
    recommendations.push(`Migliorare ${component.label.toLowerCase()} per aumentare il punteggio complessivo.`);
  }

  if (input.structure.composition.landCount < Math.round(input.structure.composition.totalCards * 0.32)) {
    recommendations.push("Controllare il numero di terre: il mazzo sembra sotto la soglia consigliata.");
  }

  return recommendations;
}

function bestComboEvaluation(comboEvaluations: readonly ComboEvaluation[]): ComboEvaluation | undefined {
  return [...comboEvaluations].sort((left, right) => right.impactScore - left.impactScore)[0];
}

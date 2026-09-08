import type { DeckStructureSummary } from "../analysis/index.js";
import type { ConsistencyAnalysis } from "../consistency/index.js";
import type { ComboEvaluation, CommanderLegalityReport, ConsistencySignal, ScoreBreakdown } from "../domain/index.js";

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

const SIGNAL_LABELS: Readonly<Record<string, string>> = {
  early_land_access: "terre nei primi turni",
  early_ramp_access: "ramp entro il turno 3",
  card_advantage_access: "draw o tutor entro il turno 5",
  interaction_access: "interaction entro il turno 5",
  tutor_access: "tutor",
  win_condition_access: "win condition",
};

const SIGNAL_RECOMMENDATIONS: Readonly<Record<string, string>> = {
  early_land_access: "Aggiungere terre per rendere piu' affidabile la mana base iniziale.",
  early_ramp_access: "Aggiungere ramp o fast mana per accelerare entro il turno 3.",
  card_advantage_access: "Aggiungere draw, selezione o tutor per vedere piu' carte entro il turno 5.",
  interaction_access: "Aggiungere removal, wipe o counter per rispondere al tavolo.",
  tutor_access: "Aggiungere tutor per trovare i pezzi chiave in modo piu' consistente.",
  win_condition_access: "Aggiungere win condition, combo payoff o tutor che le trovano.",
};

const HIGH_SIGNAL_THRESHOLD = 0.75;
const LOW_SIGNAL_THRESHOLD = 0.4;
const MAX_SUMMARY_POINTS = 4;
const MAX_LIST_ITEMS = 4;

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
  const legalityText = input.legality.isLegal
    ? "Il mazzo risulta legale rispetto ai controlli disponibili"
    : "Il mazzo ha problemi di legalita' o struttura";
  const headline = `${legalityText} e ottiene ${input.score.finalScore}/100, con bracket stimato ${input.score.commanderBracket}.`;
  const points = collectSummaryPoints(input);

  if (points.length === 0) {
    return headline;
  }

  return `${headline} ${points.join(" ")}`;
}

function collectSummaryPoints(input: GenerateExplanationInput): readonly string[] {
  const points: string[] = [];
  const highSignals = rankedSignals(input.consistency.signals, "desc").filter((signal) => signal.probability >= HIGH_SIGNAL_THRESHOLD).slice(0, 2);
  const lowSignals = rankedSignals(input.consistency.signals, "asc").filter((signal) => signal.probability <= LOW_SIGNAL_THRESHOLD).slice(0, 2);

  if (highSignals.length > 0) {
    points.push(`Accesso solido a ${joinLabels(highSignals)}.`);
  }

  if (lowSignals.length > 0) {
    points.push(`Debole su ${joinLabels(lowSignals)}.`);
  }

  if (input.consistency.sizeMultiplier < 0.8) {
    points.push(`La libreria da ${input.consistency.librarySize} carte riduce la consistenza.`);
  } else if (input.consistency.redundancyScore >= 0.75) {
    points.push("I ruoli chiave sono ben coperti.");
  } else if (input.consistency.redundancyScore <= 0.35) {
    points.push("Poca ridondanza sui ruoli chiave.");
  }

  const bestCombo = bestComboEvaluation(input.comboEvaluations ?? []);
  if (bestCombo && bestCombo.impactScore >= 75) {
    points.push(`Combo rilevante con impatto ${bestCombo.impactScore}/100.`);
  }

  return points.slice(0, MAX_SUMMARY_POINTS);
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

  for (const signal of rankedSignals(input.consistency.signals, "desc")) {
    if (signal.probability >= HIGH_SIGNAL_THRESHOLD) {
      strengths.push(`${capitalize(signalLabel(signal))}: probabilita' ${percent(signal.probability)}%.`);
    }
  }

  return strengths.slice(0, MAX_LIST_ITEMS);
}

function findWeaknesses(input: GenerateExplanationInput): readonly string[] {
  const weaknesses: string[] = [];

  if (!input.legality.isLegal) {
    weaknesses.push(`Legalita': cap ${input.legality.legalityCap}/100 con ${input.legality.issues.length} issue.`);
  }

  if (input.consistency.sizeMultiplier < 0.8) {
    weaknesses.push(`Consistenza ridotta dalla dimensione del mazzo: moltiplicatore ${input.consistency.sizeMultiplier.toFixed(2)}.`);
  }

  for (const component of input.score.components) {
    if (component.rawScore <= 45) {
      weaknesses.push(`${component.label}: ${component.rawScore}/100.`);
    }
  }

  for (const signal of rankedSignals(input.consistency.signals, "asc")) {
    if (signal.probability <= LOW_SIGNAL_THRESHOLD) {
      weaknesses.push(`${capitalize(signalLabel(signal))}: probabilita' ${percent(signal.probability)}%.`);
    }
  }

  return weaknesses.slice(0, MAX_LIST_ITEMS);
}

function findRecommendations(input: GenerateExplanationInput): readonly string[] {
  const recommendations: string[] = [];

  if (!input.legality.isLegal) {
    recommendations.push("Correggere prima gli errori di legalita' o struttura: finche' restano, il voto e' limitato.");
  }

  for (const signal of rankedSignals(input.consistency.signals, "asc")) {
    const recommendation = SIGNAL_RECOMMENDATIONS[signal.name];
    if (signal.probability <= LOW_SIGNAL_THRESHOLD && recommendation) {
      recommendations.push(recommendation);
    }
  }

  const lowComponents = [...input.score.components].filter((component) => component.rawScore <= 55 && component.category !== "consistency");
  for (const component of lowComponents.slice(0, 2)) {
    recommendations.push(`Migliorare ${component.label.toLowerCase()} per aumentare il punteggio complessivo.`);
  }

  if (input.structure.composition.landCount < Math.round(input.structure.composition.totalCards * 0.32)) {
    recommendations.push("Controllare il numero di terre: il mazzo sembra sotto la soglia consigliata.");
  }

  return unique(recommendations).slice(0, 5);
}

function rankedSignals(signals: readonly ConsistencySignal[], direction: "asc" | "desc"): ConsistencySignal[] {
  return [...signals].sort((left, right) => (direction === "asc" ? left.probability - right.probability : right.probability - left.probability));
}

function joinLabels(signals: readonly ConsistencySignal[]): string {
  const labels = signals.map((signal) => signalLabel(signal));
  if (labels.length === 1) {
    return labels[0] ?? "";
  }

  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

function signalLabel(signal: ConsistencySignal): string {
  return SIGNAL_LABELS[signal.name] ?? signal.name.replaceAll("_", " ");
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function percent(probability: number): number {
  return Math.round(probability * 100);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function bestComboEvaluation(comboEvaluations: readonly ComboEvaluation[]): ComboEvaluation | undefined {
  return [...comboEvaluations].sort((left, right) => right.impactScore - left.impactScore)[0];
}

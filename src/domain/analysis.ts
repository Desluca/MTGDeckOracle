import type { FunctionalTag } from "./card.js";
import type { ComboEvaluation, DetectedCombo } from "./combo.js";
import type { DeckComposition, DeckList } from "./deck.js";
import type { CommanderLegalityReport } from "./legality.js";
import type { ScoreBreakdown } from "./scoring.js";

export type CommanderArchetype =
  | "aggro_combat"
  | "aristocrats"
  | "artifact"
  | "blink"
  | "combo"
  | "control"
  | "enchantress"
  | "graveyard"
  | "landfall"
  | "reanimator"
  | "spellslinger"
  | "stax"
  | "tokens"
  | "tribal"
  | "voltron"
  | "unknown";

export interface ManaCurveBucket {
  readonly manaValue: number;
  readonly count: number;
}

export interface RoleCount {
  readonly tag: FunctionalTag;
  readonly count: number;
}

export interface ConsistencySignal {
  readonly name: string;
  readonly probability: number;
  readonly explanation: string;
}

export interface DeckAnalysis {
  readonly deck: DeckList;
  readonly legality: CommanderLegalityReport;
  readonly composition: DeckComposition;
  readonly archetypes: readonly CommanderArchetype[];
  readonly manaCurve: readonly ManaCurveBucket[];
  readonly roleCounts: readonly RoleCount[];
  readonly consistencySignals: readonly ConsistencySignal[];
  readonly detectedCombos: readonly DetectedCombo[];
  readonly comboEvaluations: readonly ComboEvaluation[];
  readonly score: ScoreBreakdown;
  readonly summary: string;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
}

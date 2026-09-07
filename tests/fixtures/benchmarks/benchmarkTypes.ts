import type { CommanderBracket, CommanderLegalityReport, ComboEvaluation, DeckList } from "../../../src/domain/index.js";

export interface ScoreRange {
  readonly min: number;
  readonly max: number;
}

export interface ScoringBenchmark {
  readonly id: string;
  readonly description: string;
  readonly deck: DeckList;
  readonly legality: CommanderLegalityReport;
  readonly comboEvaluations?: readonly ComboEvaluation[];
  readonly expectedScoreRange: ScoreRange;
  readonly expectedBracket?: CommanderBracket;
}

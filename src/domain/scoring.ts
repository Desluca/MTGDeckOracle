export type ScoreCategory =
  | "legality"
  | "consistency"
  | "game_plan"
  | "card_quality"
  | "mana_base"
  | "card_advantage"
  | "interaction"
  | "win_conditions"
  | "resilience"
  | "speed";

export type CommanderBracket = 1 | 2 | 3 | 4 | 5;

export interface ScoreComponent {
  readonly category: ScoreCategory;
  readonly label: string;
  readonly rawScore: number;
  readonly weightedScore: number;
  readonly weight: number;
  readonly explanation: string;
}

export interface ScorePenalty {
  readonly code: string;
  readonly label: string;
  readonly points: number;
  readonly explanation: string;
}

export interface ScoreBreakdown {
  readonly finalScore: number;
  readonly commanderBracket: CommanderBracket;
  readonly legalityCap: number;
  readonly components: readonly ScoreComponent[];
  readonly penalties: readonly ScorePenalty[];
  readonly explanation: string;
}

export interface ScoringWeights {
  readonly legality: number;
  readonly consistency: number;
  readonly gamePlan: number;
  readonly cardQuality: number;
  readonly manaBase: number;
  readonly cardAdvantage: number;
  readonly interaction: number;
  readonly winConditions: number;
  readonly resilience: number;
  readonly speed: number;
}

export const defaultScoringWeights: ScoringWeights = {
  legality: 15,
  consistency: 20,
  gamePlan: 15,
  cardQuality: 10,
  manaBase: 10,
  cardAdvantage: 8,
  interaction: 8,
  winConditions: 8,
  resilience: 4,
  speed: 2,
};

export type ComboOutcome =
  | "wins_game"
  | "infinite_mana"
  | "infinite_damage"
  | "infinite_draw"
  | "infinite_tokens"
  | "infinite_mill"
  | "infinite_life"
  | "lock"
  | "value_engine";

export type ComboSpeed = "instant" | "sorcery" | "unknown";

export type ComboCompleteness = "complete" | "partial" | "missing_key_piece";

export type CommanderComboRole =
  | "piece"
  | "payoff"
  | "enabler"
  | "tutor"
  | "protection"
  | "none";

export type ComboDataSource = "commander_spellbook" | "manual" | "other";

export interface ComboPiece {
  readonly cardName: string;
  readonly required: boolean;
  readonly alternatives?: readonly string[];
}

export interface KnownCombo {
  readonly id: string;
  readonly name: string;
  readonly source: ComboDataSource;
  readonly sourceUrl?: string;
  readonly pieces: readonly ComboPiece[];
  readonly outcomes: readonly ComboOutcome[];
  readonly estimatedSpeed?: ComboSpeed;
  readonly estimatedClosingTurnMana?: number;
  readonly description?: string;
}

export interface DetectedCombo {
  readonly combo: KnownCombo;
  readonly completeness: ComboCompleteness;
  readonly presentPieces: readonly string[];
  readonly missingPieces: readonly string[];
}

export interface ComboEvaluation {
  readonly detectedComboId: string;
  readonly impactScore: number;
  readonly speed: ComboSpeed;
  readonly totalManaValue: number;
  readonly closingTurnManaRequired?: number;
  readonly commanderRole: CommanderComboRole;
  readonly tutorAccessScore: number;
  readonly protectionScore: number;
  readonly fragilityScore: number;
  readonly explanation: string;
}

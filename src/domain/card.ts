export type Color = "W" | "U" | "B" | "R" | "G";

export type CardLegality = "legal" | "not_legal" | "banned" | "restricted" | "unknown";

export type CardSupertype =
  | "basic"
  | "legendary"
  | "snow"
  | "world"
  | "ongoing";

export type CardType =
  | "artifact"
  | "battle"
  | "creature"
  | "enchantment"
  | "instant"
  | "land"
  | "planeswalker"
  | "sorcery"
  | "tribal"
  | "unknown";

export type FunctionalTag =
  | "ramp"
  | "fast_mana"
  | "mana_fixing"
  | "card_draw"
  | "card_selection"
  | "tutor"
  | "spot_removal"
  | "board_wipe"
  | "counterspell"
  | "protection"
  | "recursion"
  | "graveyard_hate"
  | "graveyard_synergy"
  | "stax"
  | "combo_piece"
  | "combo_payoff"
  | "win_condition"
  | "commander_synergy"
  | "value_engine"
  | "land";

export interface CardIdentity {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
}

export interface CardPrintData {
  readonly setCode?: string;
  readonly collectorNumber?: string;
  readonly scryfallId?: string;
  readonly oracleId?: string;
}

export interface CardRulesData {
  readonly manaCost?: string;
  readonly manaValue: number;
  readonly colors: readonly Color[];
  readonly colorIdentity: readonly Color[];
  readonly supertypes: readonly CardSupertype[];
  readonly types: readonly CardType[];
  readonly subtypes: readonly string[];
  readonly typeLine: string;
  readonly oracleText: string;
  readonly commanderLegality: CardLegality;
  readonly canBeCommander: boolean;
  readonly isGameChanger: boolean;
}

export interface CardEvaluationData {
  readonly functionalTags: readonly FunctionalTag[];
  readonly basePowerRating?: number;
  readonly notes?: string;
}

export interface Card {
  readonly identity: CardIdentity;
  readonly print?: CardPrintData;
  readonly rules: CardRulesData;
  readonly evaluation: CardEvaluationData;
}

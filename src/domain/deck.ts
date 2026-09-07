import type { Card, Color } from "./card.js";

export type DeckSection =
  | "commander"
  | "mainboard"
  | "sideboard"
  | "maybeboard"
  | "unknown";

export type DeckSourceType =
  | "plain_text"
  | "moxfield"
  | "archidekt"
  | "manabox"
  | "other";

export interface RawDeckInput {
  readonly sourceType: DeckSourceType;
  readonly rawText: string;
  readonly sourceUrl?: string;
}

export interface ParsedDeckLine {
  readonly lineNumber: number;
  readonly quantity: number;
  readonly rawName: string;
  readonly normalizedName: string;
  readonly section: DeckSection;
}

export interface DeckCard {
  readonly card: Card;
  readonly quantity: number;
  readonly section: DeckSection;
}

export interface CommanderSelection {
  readonly commanders: readonly DeckCard[];
  readonly colorIdentity: readonly Color[];
  readonly partnerConfiguration?: string;
}

export interface DeckList {
  readonly name?: string;
  readonly input: RawDeckInput;
  readonly parsedLines: readonly ParsedDeckLine[];
  readonly commander: CommanderSelection;
  readonly cards: readonly DeckCard[];
}

export interface DeckComposition {
  readonly totalCards: number;
  readonly commanderCount: number;
  readonly mainboardCount: number;
  readonly landCount: number;
  readonly nonlandCount: number;
  readonly averageManaValue: number;
  readonly colorIdentity: readonly Color[];
}

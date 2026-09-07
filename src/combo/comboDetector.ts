import { normalizeLookupName } from "../card-data/index.js";
import type { DeckList, DetectedCombo, KnownCombo } from "../domain/index.js";
import type { ComboDataProvider } from "./comboDataSource.js";

export async function detectDeckCombos(deck: DeckList, comboDataSource: ComboDataProvider): Promise<readonly DetectedCombo[]> {
  const availableNames = getDeckCardNames(deck);
  const candidateCombos = await comboDataSource.findCombosForCards([...availableNames]);

  return candidateCombos
    .map((combo) => detectCombo(combo, availableNames))
    .filter((combo) => combo.presentPieces.length > 0);
}

export function detectCombo(combo: KnownCombo, availableNames: ReadonlySet<string>): DetectedCombo {
  const presentPieces: string[] = [];
  const missingPieces: string[] = [];

  for (const piece of combo.pieces) {
    if (isPiecePresent(piece.cardName, piece.alternatives, availableNames)) {
      presentPieces.push(piece.cardName);
      continue;
    }

    if (piece.required) {
      missingPieces.push(piece.cardName);
    }
  }

  return {
    combo,
    completeness: missingPieces.length === 0 ? "complete" : presentPieces.length > 0 ? "partial" : "missing_key_piece",
    presentPieces,
    missingPieces,
  };
}

function getDeckCardNames(deck: DeckList): ReadonlySet<string> {
  return new Set(
    deck.cards
      .filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard")
      .map((deckCard) => deckCard.card.identity.normalizedName),
  );
}

function isPiecePresent(
  cardName: string,
  alternatives: readonly string[] | undefined,
  availableNames: ReadonlySet<string>,
): boolean {
  return [cardName, ...(alternatives ?? [])].some((name) => availableNames.has(normalizeLookupName(name)));
}

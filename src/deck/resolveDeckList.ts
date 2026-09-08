import type { Card, Color, DeckCard, DeckList, ParsedDeckLine } from "../domain/index.js";
import type { CardDataSource } from "../card-data/index.js";
import { uniqueNormalizedNames } from "../card-data/index.js";
import type { ParsedDeck } from "../parser/index.js";

export interface DeckResolutionResult {
  readonly deck?: DeckList;
  readonly cardsByNormalizedName: ReadonlyMap<string, Card>;
  readonly unresolvedNames: readonly string[];
}

export async function resolveDeckList(
  parsedDeck: ParsedDeck,
  cardDataSource: CardDataSource,
): Promise<DeckResolutionResult> {
  const requestedNames = uniqueNormalizedNames(parsedDeck.lines.map((line) => line.normalizedName));
  const cardsByNormalizedName = await cardDataSource.findCardsByNames(requestedNames);
  return resolveDeckListFromMap(parsedDeck, cardsByNormalizedName);
}

export function resolveDeckListFromMap(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card>,
): DeckResolutionResult {
  const requestedNames = uniqueNormalizedNames(parsedDeck.lines.map((line) => line.normalizedName));
  const unresolvedNames = requestedNames.filter((name) => !cardsByNormalizedName.has(name));

  if (unresolvedNames.length > 0) {
    return {
      cardsByNormalizedName,
      unresolvedNames,
    };
  }

  return {
    deck: createDeckList(parsedDeck, cardsByNormalizedName),
    cardsByNormalizedName,
    unresolvedNames,
  };
}

function createDeckList(parsedDeck: ParsedDeck, cardsByNormalizedName: ReadonlyMap<string, Card>): DeckList {
  const cards = parsedDeck.lines.map((line) => createDeckCard(line, cardsByNormalizedName));
  const commanderCards = cards.filter((deckCard) => deckCard.section === "commander");

  return {
    input: parsedDeck.input,
    parsedLines: parsedDeck.lines,
    commander: {
      commanders: commanderCards,
      colorIdentity: mergeColorIdentity(commanderCards.map((deckCard) => deckCard.card.rules.colorIdentity)),
    },
    cards,
  };
}

function createDeckCard(line: ParsedDeckLine, cardsByNormalizedName: ReadonlyMap<string, Card>): DeckCard {
  const card = cardsByNormalizedName.get(line.normalizedName);

  if (!card) {
    throw new Error(`Card was not resolved: ${line.rawName}`);
  }

  return {
    card,
    quantity: line.quantity,
    section: line.section,
  };
}

function mergeColorIdentity(colorIdentities: readonly (readonly Color[])[]): readonly Color[] {
  const colors = new Set<Color>();

  for (const colorIdentity of colorIdentities) {
    for (const color of colorIdentity) {
      colors.add(color);
    }
  }

  return [...colors];
}

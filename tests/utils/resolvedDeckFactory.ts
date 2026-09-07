import type { Card, DeckCard, DeckList } from "../../src/domain/index.js";
import { createTestCard } from "./cardFactory.js";

export interface TestDeckOptions {
  readonly commanders?: readonly Card[];
  readonly mainboard?: readonly DeckCard[];
}

export function createResolvedTestDeck(options: TestDeckOptions = {}): DeckList {
  const commanders = options.commanders ?? [
    createTestCard({
      name: "Test Commander",
      colorIdentity: ["W", "U"],
      canBeCommander: true,
      typeLine: "Legendary Creature — Test",
    }),
  ];
  const commanderCards = commanders.map((card): DeckCard => ({ card, quantity: 1, section: "commander" }));
  const mainboard = options.mainboard ?? [];

  return {
    input: {
      sourceType: "plain_text",
      rawText: "",
    },
    parsedLines: [],
    commander: {
      commanders: commanderCards,
      colorIdentity: [...new Set(commanders.flatMap((card) => card.rules.colorIdentity))],
    },
    cards: [...commanderCards, ...mainboard],
  };
}

export function mainboardCard(card: Card, quantity = 1): DeckCard {
  return {
    card,
    quantity,
    section: "mainboard",
  };
}

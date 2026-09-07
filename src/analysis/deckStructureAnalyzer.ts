import type { DeckCard, DeckComposition, DeckList, FunctionalTag, ManaCurveBucket, RoleCount } from "../domain/index.js";

export interface DeckStructureSummary {
  readonly composition: DeckComposition;
  readonly manaCurve: readonly ManaCurveBucket[];
  readonly roleCounts: readonly RoleCount[];
}

export function analyzeDeckStructure(deck: DeckList): DeckStructureSummary {
  const commanderDeckCards = deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
  const landCount = countCards(commanderDeckCards.filter(isLand));
  const nonlandCards = commanderDeckCards.filter((deckCard) => !isLand(deckCard));
  const nonlandCount = countCards(nonlandCards);

  return {
    composition: {
      totalCards: countCards(commanderDeckCards),
      commanderCount: countCards(commanderDeckCards.filter((deckCard) => deckCard.section === "commander")),
      mainboardCount: countCards(commanderDeckCards.filter((deckCard) => deckCard.section === "mainboard")),
      landCount,
      nonlandCount,
      averageManaValue: calculateAverageManaValue(nonlandCards),
      colorIdentity: deck.commander.colorIdentity,
    },
    manaCurve: calculateManaCurve(nonlandCards),
    roleCounts: calculateRoleCounts(commanderDeckCards),
  };
}

function isLand(deckCard: DeckCard): boolean {
  return deckCard.card.rules.types.includes("land") || deckCard.card.evaluation.functionalTags.includes("land");
}

function countCards(cards: readonly DeckCard[]): number {
  return cards.reduce((total, deckCard) => total + deckCard.quantity, 0);
}

function calculateAverageManaValue(cards: readonly DeckCard[]): number {
  const totalCards = countCards(cards);
  if (totalCards === 0) {
    return 0;
  }

  const totalManaValue = cards.reduce((total, deckCard) => total + deckCard.card.rules.manaValue * deckCard.quantity, 0);
  return Math.round((totalManaValue / totalCards) * 100) / 100;
}

function calculateManaCurve(cards: readonly DeckCard[]): readonly ManaCurveBucket[] {
  const buckets = new Map<number, number>();

  for (const deckCard of cards) {
    const manaValue = deckCard.card.rules.manaValue;
    buckets.set(manaValue, (buckets.get(manaValue) ?? 0) + deckCard.quantity);
  }

  return [...buckets.entries()]
    .sort(([leftManaValue], [rightManaValue]) => leftManaValue - rightManaValue)
    .map(([manaValue, count]) => ({ manaValue, count }));
}

function calculateRoleCounts(cards: readonly DeckCard[]): readonly RoleCount[] {
  const roleCounts = new Map<FunctionalTag, number>();

  for (const deckCard of cards) {
    for (const tag of new Set(deckCard.card.evaluation.functionalTags)) {
      roleCounts.set(tag, (roleCounts.get(tag) ?? 0) + deckCard.quantity);
    }
  }

  return [...roleCounts.entries()]
    .sort(([leftTag], [rightTag]) => leftTag.localeCompare(rightTag))
    .map(([tag, count]) => ({ tag, count }));
}

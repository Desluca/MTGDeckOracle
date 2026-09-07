import { normalizeLookupName } from "../card-data/index.js";
import type { Card, DeckList, FunctionalTag } from "../domain/index.js";

export interface TagOverride {
  readonly cardName: string;
  readonly add?: readonly FunctionalTag[];
  readonly remove?: readonly FunctionalTag[];
  readonly notes?: string;
}

export type TagOverrideMap = ReadonlyMap<string, TagOverride>;

export function createTagOverrideMap(overrides: readonly TagOverride[]): TagOverrideMap {
  return new Map(overrides.map((override) => [normalizeLookupName(override.cardName), override]));
}

export function applyTagOverridesToCard(card: Card, overrides: TagOverrideMap): Card {
  const override = overrides.get(card.identity.normalizedName);
  if (!override) {
    return card;
  }

  const tags = new Set<FunctionalTag>(card.evaluation.functionalTags);

  for (const tag of override.remove ?? []) {
    tags.delete(tag);
  }

  for (const tag of override.add ?? []) {
    tags.add(tag);
  }

  return {
    ...card,
    evaluation: {
      ...card.evaluation,
      functionalTags: [...tags].sort(),
      ...(override.notes ?? card.evaluation.notes ? { notes: override.notes ?? card.evaluation.notes } : {}),
    },
  };
}

export function applyTagOverridesToDeck(deck: DeckList, overrides: TagOverrideMap): DeckList {
  const cards = deck.cards.map((deckCard) => ({
    ...deckCard,
    card: applyTagOverridesToCard(deckCard.card, overrides),
  }));

  return {
    ...deck,
    commander: {
      ...deck.commander,
      commanders: cards.filter((deckCard) => deckCard.section === "commander"),
    },
    cards,
  };
}

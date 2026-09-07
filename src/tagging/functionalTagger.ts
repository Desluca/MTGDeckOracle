import type { Card, DeckList, FunctionalTag } from "../domain/index.js";

export function inferFunctionalTags(card: Card): readonly FunctionalTag[] {
  const tags = new Set<FunctionalTag>(card.evaluation.functionalTags);
  const oracleText = card.rules.oracleText.toLowerCase();
  const typeLine = card.rules.typeLine.toLowerCase();

  if (card.rules.types.includes("land")) {
    tags.add("land");
  }

  if (isRamp(card, oracleText)) {
    tags.add(card.rules.manaValue <= 1 && !card.rules.types.includes("land") ? "fast_mana" : "ramp");
  }

  if (oracleText.includes("draw a card") || oracleText.includes("draw cards") || oracleText.includes("draw two cards")) {
    tags.add("card_draw");
  }

  if (oracleText.includes("scry") || oracleText.includes("surveil") || oracleText.includes("look at the top")) {
    tags.add("card_selection");
  }

  if (oracleText.includes("search your library")) {
    tags.add("tutor");
  }

  if (oracleText.includes("counter target")) {
    tags.add("counterspell");
  }

  if (isSpotRemoval(oracleText)) {
    tags.add("spot_removal");
  }

  if (isBoardWipe(oracleText)) {
    tags.add("board_wipe");
  }

  if (isProtection(oracleText)) {
    tags.add("protection");
  }

  if (oracleText.includes("from your graveyard") || oracleText.includes("from a graveyard to")) {
    tags.add("recursion");
  }

  if (oracleText.includes("exile target card from a graveyard") || oracleText.includes("exile all graveyards")) {
    tags.add("graveyard_hate");
  }

  if (oracleText.includes("spells cost") || oracleText.includes("players can't") || oracleText.includes("opponents can't")) {
    tags.add("stax");
  }

  if (oracleText.includes("you win the game") || oracleText.includes("target player loses the game")) {
    tags.add("win_condition");
  }

  if (typeLine.includes("legendary") && typeLine.includes("creature") && tags.size > card.evaluation.functionalTags.length) {
    tags.add("commander_synergy");
  }

  return [...tags].sort();
}

export function tagCard(card: Card): Card {
  return {
    ...card,
    evaluation: {
      ...card.evaluation,
      functionalTags: inferFunctionalTags(card),
    },
  };
}

export function tagDeckCards(deck: DeckList): DeckList {
  const taggedCards = deck.cards.map((deckCard) => ({
    ...deckCard,
    card: tagCard(deckCard.card),
  }));
  const taggedCommanders = taggedCards.filter((deckCard) => deckCard.section === "commander");

  return {
    ...deck,
    commander: {
      ...deck.commander,
      commanders: taggedCommanders,
    },
    cards: taggedCards,
  };
}

function isRamp(card: Card, oracleText: string): boolean {
  if (oracleText.includes("add ") && oracleText.includes("mana")) {
    return true;
  }

  if (oracleText.includes("{t}: add")) {
    return true;
  }

  return (
    oracleText.includes("search your library") &&
    oracleText.includes("land") &&
    (oracleText.includes("put") || oracleText.includes("onto the battlefield"))
  );
}

function isSpotRemoval(oracleText: string): boolean {
  return (
    oracleText.includes("destroy target") ||
    oracleText.includes("exile target") ||
    oracleText.includes("return target") ||
    oracleText.includes("deals damage to target")
  );
}

function isBoardWipe(oracleText: string): boolean {
  return (
    oracleText.includes("destroy all") ||
    oracleText.includes("exile all") ||
    oracleText.includes("return all") ||
    oracleText.includes("deals") && oracleText.includes("damage to each creature") ||
    oracleText.includes("each creature gets")
  );
}

function isProtection(oracleText: string): boolean {
  return (
    oracleText.includes("hexproof") ||
    oracleText.includes("indestructible") ||
    oracleText.includes("protection from") ||
    oracleText.includes("prevent all damage") ||
    oracleText.includes("phase out")
  );
}

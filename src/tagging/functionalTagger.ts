import { uniqueNormalizedNames } from "../card-data/index.js";
import type { Card, DeckList, FunctionalTag } from "../domain/index.js";
import type { CardTagProvider } from "./cardTagProvider.js";

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

  if (oracleText.includes("graveyard")) {
    tags.add("graveyard_synergy");
  }

  if (isArtifactSynergy(card, oracleText)) {
    tags.add("artifact_synergy");
  }

  if (mentionsCreatedToken(oracleText)) {
    tags.add("token_synergy");
  }

  if (isSpellslinger(oracleText)) {
    tags.add("spellslinger");
  }

  if (isLifegain(oracleText)) {
    tags.add("lifegain");
  }

  if (isAristocrats(oracleText)) {
    tags.add("aristocrats");
  }

  if (oracleText.includes("+1/+1 counter") || oracleText.includes("proliferate")) {
    tags.add("counters_synergy");
  }

  if (isEnchantmentSynergy(card, oracleText, typeLine)) {
    tags.add("enchantment_synergy");
  }

  if (isEquipmentSynergy(oracleText, typeLine)) {
    tags.add("equipment_synergy");
  }

  if (oracleText.includes("exile target card from a graveyard") || oracleText.includes("exile all graveyards")) {
    tags.add("graveyard_hate");
  }

  if (isStax(oracleText)) {
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

export function tagCard(card: Card, externalTags: readonly FunctionalTag[] = []): Card {
  return {
    ...card,
    evaluation: {
      ...card.evaluation,
      functionalTags: mergeFunctionalTags(inferFunctionalTags(card), externalTags),
    },
  };
}

export function tagDeckCards(
  deck: DeckList,
  externalTagsByNormalizedName: ReadonlyMap<string, readonly FunctionalTag[]> = new Map(),
): DeckList {
  const taggedCards = deck.cards.map((deckCard) => ({
    ...deckCard,
    card: tagCard(deckCard.card, externalTagsByNormalizedName.get(deckCard.card.identity.normalizedName) ?? []),
  }));
  const tribalTaggedCards = applyCommanderTribalTags(taggedCards);
  const taggedCommanders = tribalTaggedCards.filter((deckCard) => deckCard.section === "commander");

  return {
    ...deck,
    commander: {
      ...deck.commander,
      commanders: taggedCommanders,
    },
    cards: tribalTaggedCards,
  };
}

export async function tagDeckCardsWithProvider(deck: DeckList, tagProvider: CardTagProvider): Promise<DeckList> {
  const normalizedNames = uniqueNormalizedNames(deck.cards.map((deckCard) => deckCard.card.identity.normalizedName));
  const externalTagsByNormalizedName = await tagProvider.findTagsByNames(normalizedNames);

  return tagDeckCards(deck, externalTagsByNormalizedName);
}

function mergeFunctionalTags(
  inferredTags: readonly FunctionalTag[],
  externalTags: readonly FunctionalTag[],
): readonly FunctionalTag[] {
  return [...new Set([...inferredTags, ...externalTags])].sort();
}

function isRamp(card: Card, oracleText: string): boolean {
  if (card.rules.types.includes("land")) {
    return false;
  }

  if (oracleText.includes("add ") && oracleText.includes("mana")) {
    return true;
  }

  if (oracleText.includes("{t}: add") || oracleText.includes("add {")) {
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
    oracleText.includes("shroud") ||
    oracleText.includes("indestructible") ||
    oracleText.includes("protection from") ||
    oracleText.includes("prevent all damage") ||
    oracleText.includes("phase out")
  );
}

function isArtifactSynergy(card: Card, oracleText: string): boolean {
  return (
    oracleText.includes("artifacts you control") ||
    oracleText.includes("artifact you control") ||
    oracleText.includes("cast an artifact") ||
    oracleText.includes("artifact creatures") ||
    oracleText.includes("affinity for artifacts") ||
    (card.rules.types.includes("artifact") && oracleText.includes("other artifacts"))
  );
}

function isStax(oracleText: string): boolean {
  return (
    oracleText.includes("spells cost") ||
    oracleText.includes("player can't") ||
    oracleText.includes("players can't") ||
    oracleText.includes("opponents can't") ||
    oracleText.includes("cost {1} more") ||
    oracleText.includes("can't untap more")
  );
}

function isSpellslinger(oracleText: string): boolean {
  return (
    oracleText.includes("instant or sorcery") ||
    oracleText.includes("instants and sorceries") ||
    oracleText.includes("magecraft") ||
    oracleText.includes("prowess") ||
    oracleText.includes("copy target instant") ||
    oracleText.includes("copy target sorcery") ||
    oracleText.includes("noncreature spell")
  );
}

function isLifegain(oracleText: string): boolean {
  return (
    oracleText.includes("you gain") && oracleText.includes("life") ||
    oracleText.includes("life you gain") ||
    oracleText.includes("lifelink")
  );
}

function isAristocrats(oracleText: string): boolean {
  return (
    oracleText.includes("sacrifice a creature") ||
    oracleText.includes("whenever a creature you control dies") ||
    oracleText.includes("whenever you sacrifice") ||
    oracleText.includes("creature dying") ||
    oracleText.includes("creature dies")
  );
}

function isEnchantmentSynergy(card: Card, oracleText: string, typeLine: string): boolean {
  return (
    oracleText.includes("enchantments you control") ||
    oracleText.includes("enchantment you control") ||
    oracleText.includes("cast an enchantment") ||
    oracleText.includes("constellation") ||
    typeLine.includes("enchantress")
  );
}

function isEquipmentSynergy(oracleText: string, typeLine: string): boolean {
  return (
    typeLine.includes("equipment") ||
    oracleText.includes("equipped creature") ||
    oracleText.includes("equipment you control") ||
    oracleText.includes("attach") && oracleText.includes("equipment")
  );
}

function applyCommanderTribalTags(deckCards: DeckList["cards"]): DeckList["cards"] {
  const commanderTypes = deckCards
    .filter((deckCard) => deckCard.section === "commander")
    .flatMap((deckCard) => deckCard.card.rules.subtypes)
    .filter((subtype, index, subtypes) => subtypes.indexOf(subtype) === index);

  if (commanderTypes.length === 0) {
    return deckCards;
  }

  const commanderCaresAboutTribe = deckCards
    .filter((deckCard) => deckCard.section === "commander")
    .some((deckCard) => commanderTypes.some((subtype) => mentionsCreatureType(deckCard.card.rules.oracleText.toLowerCase(), subtype)));

  if (!commanderCaresAboutTribe) {
    return deckCards;
  }

  return deckCards.map((deckCard) => {
    if (deckCard.section !== "mainboard") {
      return deckCard;
    }

    const typeLine = deckCard.card.rules.typeLine.toLowerCase();
    const oracleText = deckCard.card.rules.oracleText.toLowerCase();
    const matchesTribe = commanderTypes.some(
      (subtype) =>
        deckCard.card.rules.subtypes.some((cardSubtype) => cardSubtype.toLowerCase() === subtype.toLowerCase()) ||
        mentionsCreatureType(typeLine, subtype) ||
        mentionsCreatureType(oracleText, subtype),
    );

    if (!matchesTribe || deckCard.card.evaluation.functionalTags.includes("tribal_synergy")) {
      return deckCard;
    }

    return {
      ...deckCard,
      card: {
        ...deckCard.card,
        evaluation: {
          ...deckCard.card.evaluation,
          functionalTags: mergeFunctionalTags(deckCard.card.evaluation.functionalTags, ["tribal_synergy"]),
        },
      },
    };
  });
}

function mentionsCreatedToken(oracleText: string): boolean {
  return oracleText.includes("create") && /\btokens?\b/.test(oracleText);
}

function mentionsCreatureType(text: string, subtype: string): boolean {
  const lower = subtype.toLowerCase();
  const plural = lower.endsWith("f") ? `${lower.slice(0, -1)}ves` : `${lower}s`;
  return text.includes(lower) || text.includes(plural);
}

import type { DeckCard, DeckList, FunctionalTag } from "../domain/index.js";
import { eloRatingToBasePowerRating, type CardRatingProvider } from "../ratings/index.js";
import { commanderThemeMultiplier, inferCommanderThemes } from "./commanderThemes.js";

export interface CardContribution {
  readonly cardName: string;
  readonly baseValue: number;
  readonly dynamicMultiplier: number;
  readonly contextualValue: number;
  readonly reasons: readonly string[];
}

export interface CardContributionOptions {
  readonly ratingProvider?: CardRatingProvider;
}

interface RoleTarget {
  readonly id: string;
  readonly tags: readonly FunctionalTag[];
  readonly idealPerHundred: number;
  readonly label: string;
}

const ROLE_TARGETS: readonly RoleTarget[] = [
  { id: "ramp", tags: ["ramp", "fast_mana"], idealPerHundred: 10, label: "ramp" },
  { id: "card_advantage", tags: ["card_draw", "card_selection"], idealPerHundred: 10, label: "card advantage" },
  { id: "interaction", tags: ["spot_removal", "board_wipe", "counterspell", "graveyard_hate"], idealPerHundred: 9, label: "interaction" },
  { id: "resilience", tags: ["protection", "recursion"], idealPerHundred: 6, label: "resilience" },
  { id: "graveyard", tags: ["graveyard_synergy", "recursion", "graveyard_hate"], idealPerHundred: 6, label: "graveyard package" },
  { id: "artifacts", tags: ["artifact_synergy"], idealPerHundred: 8, label: "artifact package" },
  { id: "tokens", tags: ["token_synergy"], idealPerHundred: 8, label: "token package" },
  { id: "spellslinger", tags: ["spellslinger"], idealPerHundred: 8, label: "spellslinger package" },
  { id: "lifegain", tags: ["lifegain"], idealPerHundred: 8, label: "lifegain package" },
  { id: "aristocrats", tags: ["aristocrats"], idealPerHundred: 8, label: "aristocrats package" },
  { id: "counters", tags: ["counters_synergy"], idealPerHundred: 8, label: "counters package" },
  { id: "enchantments", tags: ["enchantment_synergy"], idealPerHundred: 8, label: "enchantment package" },
  { id: "equipment", tags: ["equipment_synergy"], idealPerHundred: 8, label: "equipment package" },
  { id: "tribal", tags: ["tribal_synergy"], idealPerHundred: 12, label: "tribal package" },
  { id: "win_condition", tags: ["win_condition", "combo_payoff"], idealPerHundred: 4, label: "win condition" },
  { id: "tutor", tags: ["tutor"], idealPerHundred: 5, label: "tutor" },
  { id: "mana_base", tags: ["land", "mana_fixing"], idealPerHundred: 37, label: "mana base" },
];

export function evaluateDeckCardContributions(deck: DeckList, options: CardContributionOptions = {}): readonly CardContribution[] {
  const deckCards = commanderDeckCards(deck);
  const deckSize = countCards(deckCards);

  return deckCards.map((deckCard) => evaluateCardContribution(deckCard, deckCards, deckSize, options));
}

export function evaluateCardContribution(
  deckCard: DeckCard,
  deckCards: readonly DeckCard[],
  deckSize = countCards(deckCards),
  options: CardContributionOptions = {},
): CardContribution {
  const baseValue = getBasePowerRating(deckCard, options.ratingProvider);
  const relevantTargets = ROLE_TARGETS.filter((target) =>
    target.tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag)),
  );

  if (relevantTargets.length === 0) {
    return {
      cardName: deckCard.card.identity.name,
      baseValue,
      dynamicMultiplier: 0.85,
      contextualValue: roundValue(baseValue * 0.85),
      reasons: ["Nessun ruolo funzionale rilevato: valore contestuale ridotto."],
    };
  }

  const roleMultipliers = relevantTargets.map((target) => roleMultiplier(target, deckCards, deckSize));
  const dynamicMultiplier = roundValue(average(roleMultipliers.map((item) => item.multiplier)));

  return {
    cardName: deckCard.card.identity.name,
    baseValue,
    dynamicMultiplier,
    contextualValue: roundValue(clamp(baseValue * dynamicMultiplier, 0, 10)),
    reasons: roleMultipliers.map((item) => item.reason),
  };
}

function getBasePowerRating(deckCard: DeckCard, ratingProvider: CardRatingProvider | undefined): number {
  const externalEloRating = ratingProvider?.getEloRating(deckCard.card);

  if (externalEloRating !== undefined) {
    return eloRatingToBasePowerRating(externalEloRating);
  }

  return deckCard.card.evaluation.basePowerRating ?? 5;
}

function roleMultiplier(target: RoleTarget, deckCards: readonly DeckCard[], deckSize: number): { readonly multiplier: number; readonly reason: string } {
  const roleCount = countTagged(deckCards, target.tags);
  const normalizedCount = deckSize > 0 ? (roleCount / deckSize) * 100 : 0;
  const adjustedIdealPerHundred = target.idealPerHundred * commanderTargetMultiplier(target, deckCards);

  if (normalizedCount === 0) {
    return {
      multiplier: 1.35,
      reason: `${target.label} assente: valore marginale alto.`,
    };
  }

  if (normalizedCount < adjustedIdealPerHundred * 0.7) {
    return {
      multiplier: 1.25,
      reason: `${target.label} sotto soglia: valore marginale aumentato.`,
    };
  }

  if (normalizedCount <= adjustedIdealPerHundred * 1.2) {
    return {
      multiplier: 1,
      reason: `${target.label} in range: valore marginale neutro.`,
    };
  }

  return {
    multiplier: Math.max(0.75, adjustedIdealPerHundred / normalizedCount),
    reason: `${target.label} gia' abbondante: diminishing returns applicato.`,
  };
}

function commanderTargetMultiplier(target: RoleTarget, deckCards: readonly DeckCard[]): number {
  return commanderThemeMultiplier(target.id, inferCommanderThemes(deckCards));
}

function commanderDeckCards(deck: DeckList): readonly DeckCard[] {
  return deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
}

function countCards(cards: readonly DeckCard[]): number {
  return cards.reduce((total, deckCard) => total + deckCard.quantity, 0);
}

function countTagged(cards: readonly DeckCard[], tags: readonly FunctionalTag[]): number {
  return cards.reduce((total, deckCard) => {
    const hasTag = tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag));
    return total + (hasTag ? deckCard.quantity : 0);
  }, 0);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

import type { DeckCard, DeckList, FunctionalTag } from "../domain/index.js";
import { eloRatingToBasePowerRating, type CardRatingProvider } from "../ratings/index.js";

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
  readonly tags: readonly FunctionalTag[];
  readonly idealPerHundred: number;
  readonly label: string;
}

const ROLE_TARGETS: readonly RoleTarget[] = [
  { tags: ["ramp", "fast_mana"], idealPerHundred: 10, label: "ramp" },
  { tags: ["card_draw", "card_selection"], idealPerHundred: 10, label: "card advantage" },
  { tags: ["spot_removal", "board_wipe", "counterspell", "graveyard_hate"], idealPerHundred: 9, label: "interaction" },
  { tags: ["protection", "recursion"], idealPerHundred: 6, label: "resilience" },
  { tags: ["win_condition", "combo_payoff"], idealPerHundred: 4, label: "win condition" },
  { tags: ["tutor"], idealPerHundred: 5, label: "tutor" },
  { tags: ["land", "mana_fixing"], idealPerHundred: 37, label: "mana base" },
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

  if (normalizedCount === 0) {
    return {
      multiplier: 1.35,
      reason: `${target.label} assente: valore marginale alto.`,
    };
  }

  if (normalizedCount < target.idealPerHundred * 0.7) {
    return {
      multiplier: 1.25,
      reason: `${target.label} sotto soglia: valore marginale aumentato.`,
    };
  }

  if (normalizedCount <= target.idealPerHundred * 1.2) {
    return {
      multiplier: 1,
      reason: `${target.label} in range: valore marginale neutro.`,
    };
  }

  return {
    multiplier: Math.max(0.45, target.idealPerHundred / normalizedCount),
    reason: `${target.label} gia' abbondante: diminishing returns applicato.`,
  };
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

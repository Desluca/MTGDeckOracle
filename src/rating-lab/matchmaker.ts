import type { CardMatch, MatchStrategy, RatingCard } from "./ratingTypes.js";
import type { RatingStore } from "./ratingStore.js";
import type { RandomCardSource } from "./scryfallRandomCardSource.js";

export interface MatchmakerOptions {
  readonly firstCardRatingPool?: FirstCardRatingPool;
  readonly similarRatingChance?: number;
  readonly highRatedFirstCardChance?: number;
  readonly randomFn?: () => number;
}

export type FirstCardRatingPool = "all" | "strong" | "medium" | "weak";

const DEFAULT_SIMILAR_RATING_CHANCE = 0.7;
const DEFAULT_HIGH_RATED_FIRST_CARD_CHANCE = 0.5;
const RATING_BASELINE = 1500;
const STRONG_RATING_THRESHOLD = 1700;
const SIMILAR_RATING_RANGE = 0.1;

export async function createCardMatch(
  store: RatingStore,
  randomCardSource: RandomCardSource,
  options: MatchmakerOptions = {},
): Promise<CardMatch> {
  const similarRatingChance = options.similarRatingChance ?? DEFAULT_SIMILAR_RATING_CHANCE;
  const highRatedFirstCardChance = options.highRatedFirstCardChance ?? DEFAULT_HIGH_RATED_FIRST_CARD_CHANCE;
  const randomFn = options.randomFn ?? Math.random;
  const left =
    (await findFirstCardFromRatingPool(store, options.firstCardRatingPool ?? "all", randomFn() < highRatedFirstCardChance, randomFn)) ??
    (await store.upsertCard(await randomCardSource.getRandomCard()));
  const shouldUseSimilarRating = randomFn() < similarRatingChance;
  const similarCard = shouldUseSimilarRating ? await findSimilarRatedCard(store, left, randomFn) : undefined;
  const right = similarCard ?? (await store.upsertCard(await randomCardSource.getRandomCard()));
  const strategy: MatchStrategy = similarCard ? "similar_rating" : "random";

  if (right.id === left.id) {
    return createCardMatch(store, randomCardSource, { similarRatingChance: 0, randomFn });
  }

  return {
    left,
    right,
    strategy,
  };
}

async function findFirstCardFromRatingPool(
  store: RatingStore,
  ratingPool: FirstCardRatingPool,
  useHighRatedPool: boolean,
  randomFn: () => number,
): Promise<RatingCard | undefined> {
  const cards = await store.findCardsWithRatings();

  if (ratingPool !== "all") {
    return pickRandomCard(cards.filter((card) => cardMatchesRatingPool(card, ratingPool)), randomFn);
  }

  const preferredCandidates = cards.filter((card) => (useHighRatedPool ? card.rating > RATING_BASELINE : card.rating <= RATING_BASELINE));
  const fallbackCandidates = cards.filter((card) => (useHighRatedPool ? card.rating <= RATING_BASELINE : card.rating > RATING_BASELINE));

  return pickRandomCard(preferredCandidates, randomFn) ?? pickRandomCard(fallbackCandidates, randomFn);
}

function cardMatchesRatingPool(card: RatingCard, ratingPool: Exclude<FirstCardRatingPool, "all">): boolean {
  if (ratingPool === "weak") {
    return card.rating < RATING_BASELINE;
  }

  if (ratingPool === "medium") {
    return card.rating >= RATING_BASELINE && card.rating <= STRONG_RATING_THRESHOLD;
  }

  return card.rating > STRONG_RATING_THRESHOLD;
}

async function findSimilarRatedCard(store: RatingStore, targetCard: RatingCard, randomFn: () => number): Promise<RatingCard | undefined> {
  const ratingRange = Math.max(1, Math.round(targetCard.rating * SIMILAR_RATING_RANGE));
  const candidates = (await store.findCardsWithRatings())
    .filter((card) => card.id !== targetCard.id)
    .filter((card) => Math.abs(card.rating - targetCard.rating) <= ratingRange);

  return pickRandomCard(candidates, randomFn);
}

function pickRandomCard(cards: readonly RatingCard[], randomFn: () => number): RatingCard | undefined {
  if (cards.length === 0) {
    return undefined;
  }

  return cards[Math.floor(randomFn() * cards.length)] ?? cards[0];
}

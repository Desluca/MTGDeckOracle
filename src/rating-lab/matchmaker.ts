import type { CardMatch, MatchStrategy, RatingCard } from "./ratingTypes.js";
import type { RatingStore } from "./ratingStore.js";
import type { RandomCardSource } from "./scryfallRandomCardSource.js";

export interface MatchmakerOptions {
  readonly similarRatingChance?: number;
  readonly randomFn?: () => number;
}

const DEFAULT_SIMILAR_RATING_CHANCE = 0.5;

export async function createCardMatch(
  store: RatingStore,
  randomCardSource: RandomCardSource,
  options: MatchmakerOptions = {},
): Promise<CardMatch> {
  const similarRatingChance = options.similarRatingChance ?? DEFAULT_SIMILAR_RATING_CHANCE;
  const randomFn = options.randomFn ?? Math.random;
  const left = await store.upsertCard(await randomCardSource.getRandomCard());
  const shouldUseSimilarRating = randomFn() < similarRatingChance;
  const similarCard = shouldUseSimilarRating ? await findClosestRatedCard(store, left) : undefined;
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

async function findClosestRatedCard(store: RatingStore, targetCard: RatingCard): Promise<RatingCard | undefined> {
  const candidates = (await store.findCardsWithRatings())
    .filter((card) => card.id !== targetCard.id)
    .filter((card) => card.wins + card.losses > 0)
    .sort((left, right) => Math.abs(left.rating - targetCard.rating) - Math.abs(right.rating - targetCard.rating));

  return candidates[0];
}

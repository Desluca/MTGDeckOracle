import type { RatingCardDetailsSource } from "./scryfallRatingCardDetailsSource.js";
import type { RatingStore } from "./ratingStore.js";
import type { RatingCard } from "./ratingTypes.js";

export async function enrichLeaderboardCards(
  store: RatingStore,
  detailsSource: RatingCardDetailsSource,
  cards: readonly RatingCard[],
): Promise<readonly RatingCard[]> {
  const cardsMissingImages = cards.filter((card) => !card.imageUrl);

  if (cardsMissingImages.length === 0) {
    return cards;
  }

  const detailedCards = await detailsSource.findCardsByNames(cardsMissingImages.map((card) => card.name));
  const detailedCardsByName = new Map(detailedCards.map((card) => [normalizeName(card.name), card]));
  const savedCardsByName = new Map<string, RatingCard>();

  for (const card of cardsMissingImages) {
    const detailedCard = detailedCardsByName.get(normalizeName(card.name));

    if (detailedCard) {
      savedCardsByName.set(normalizeName(card.name), await store.upsertCard(detailedCard));
    }
  }

  return cards.map((card) => savedCardsByName.get(normalizeName(card.name)) ?? card);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

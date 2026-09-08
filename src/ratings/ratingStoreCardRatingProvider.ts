import type { RatingStore } from "../rating-lab/index.js";
import { InMemoryCardRatingProvider } from "./cardRatingProvider.js";

export async function loadCardRatingProviderFromRatingStore(store: RatingStore): Promise<InMemoryCardRatingProvider> {
  const ratedCards = await store.findCardsWithRatings();

  return new InMemoryCardRatingProvider(
    Object.fromEntries(ratedCards.map((card) => [card.name, card.rating])),
  );
}

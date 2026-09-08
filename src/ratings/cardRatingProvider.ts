import type { Card } from "../domain/index.js";

export interface CardRatingProvider {
  getEloRating(card: Card): number | undefined;
}

export class InMemoryCardRatingProvider implements CardRatingProvider {
  private readonly ratingsByName: ReadonlyMap<string, number>;

  constructor(ratingsByName: ReadonlyMap<string, number> | Record<string, number>) {
    this.ratingsByName =
      ratingsByName instanceof Map
        ? new Map([...ratingsByName.entries()].map(([name, rating]) => [normalizeRatingName(name), rating]))
        : new Map(Object.entries(ratingsByName).map(([name, rating]) => [normalizeRatingName(name), rating]));
  }

  getEloRating(card: Card): number | undefined {
    return this.ratingsByName.get(card.identity.normalizedName) ?? this.ratingsByName.get(normalizeRatingName(card.identity.name));
  }
}

export function eloRatingToBasePowerRating(eloRating: number): number {
  // 1500 is the neutral Elo starting point, so it should remain close to the old neutral 5/10 card rating.
  return round(clamp(((eloRating - 900) / 1200) * 10, 0, 10));
}

function normalizeRatingName(name: string): string {
  return name.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

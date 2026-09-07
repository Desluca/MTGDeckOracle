export interface RatingCard {
  readonly id: string;
  readonly oracleId?: string;
  readonly name: string;
  readonly typeLine: string;
  readonly manaValue: number;
  readonly imageUrl?: string;
  readonly scryfallUri?: string;
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
}

export interface CardComparison {
  readonly id: string;
  readonly winnerCardId: string;
  readonly loserCardId: string;
  readonly winnerRatingBefore: number;
  readonly loserRatingBefore: number;
  readonly winnerRatingAfter: number;
  readonly loserRatingAfter: number;
  readonly strategy: MatchStrategy;
  readonly visitorId?: string;
  readonly createdAt: string;
}

export type MatchStrategy = "random" | "similar_rating";

export interface CardMatch {
  readonly left: RatingCard;
  readonly right: RatingCard;
  readonly strategy: MatchStrategy;
}

export interface RatingLabDatabase {
  readonly cards: Record<string, RatingCard>;
  readonly comparisons: readonly CardComparison[];
  readonly metadata?: RatingLabMetadata;
}

export interface RatingLabMetadata {
  readonly seedVersions?: Record<string, string>;
  readonly seededCardRatings?: Record<string, RatingCardSeed>;
}

export interface RatingCardSeed {
  readonly normalizedName: string;
  readonly name: string;
  readonly rating: number;
}

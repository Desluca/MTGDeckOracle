import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

import { updateEloRatings } from "./elo.js";
import type { CardComparison, MatchStrategy, RatingCard, RatingLabDatabase } from "./ratingTypes.js";

const EMPTY_DATABASE: RatingLabDatabase = {
  cards: {},
  comparisons: [],
};

export interface RatingStore {
  getDatabase(): Promise<RatingLabDatabase>;
  upsertCard(card: RatingCard): Promise<RatingCard>;
  findCard(cardId: string): Promise<RatingCard | undefined>;
  findCardsWithRatings(): Promise<readonly RatingCard[]>;
  recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy): Promise<CardComparison>;
}

export class FileRatingStore implements RatingStore {
  constructor(private readonly databasePath: string) {}

  async getDatabase(): Promise<RatingLabDatabase> {
    return this.readDatabase();
  }

  async upsertCard(card: RatingCard): Promise<RatingCard> {
    const database = await this.readDatabase();
    const existingCard = database.cards[card.id];
    const nextCard = existingCard ? { ...card, rating: existingCard.rating, wins: existingCard.wins, losses: existingCard.losses } : card;

    await this.writeDatabase({
      ...database,
      cards: {
        ...database.cards,
        [card.id]: nextCard,
      },
    });

    return nextCard;
  }

  async findCard(cardId: string): Promise<RatingCard | undefined> {
    const database = await this.readDatabase();
    return database.cards[cardId];
  }

  async findCardsWithRatings(): Promise<readonly RatingCard[]> {
    const database = await this.readDatabase();
    return Object.values(database.cards);
  }

  async recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy): Promise<CardComparison> {
    const database = await this.readDatabase();
    const winner = database.cards[winnerCardId];
    const loser = database.cards[loserCardId];

    if (!winner || !loser) {
      throw new Error("Cannot record vote for cards that are not in the rating database.");
    }

    const updatedRatings = updateEloRatings(winner.rating, loser.rating);
    const updatedWinner: RatingCard = {
      ...winner,
      rating: updatedRatings.winnerRating,
      wins: winner.wins + 1,
    };
    const updatedLoser: RatingCard = {
      ...loser,
      rating: updatedRatings.loserRating,
      losses: loser.losses + 1,
    };
    const comparison: CardComparison = {
      id: randomUUID(),
      winnerCardId,
      loserCardId,
      winnerRatingBefore: winner.rating,
      loserRatingBefore: loser.rating,
      winnerRatingAfter: updatedWinner.rating,
      loserRatingAfter: updatedLoser.rating,
      strategy,
      createdAt: new Date().toISOString(),
    };

    await this.writeDatabase({
      cards: {
        ...database.cards,
        [winnerCardId]: updatedWinner,
        [loserCardId]: updatedLoser,
      },
      comparisons: [...database.comparisons, comparison],
    });

    return comparison;
  }

  private async readDatabase(): Promise<RatingLabDatabase> {
    try {
      const rawDatabase = await readFile(this.databasePath, "utf8");
      return JSON.parse(rawDatabase) as RatingLabDatabase;
    } catch (error) {
      if (isMissingFileError(error)) {
        return EMPTY_DATABASE;
      }

      throw error;
    }
  }

  private async writeDatabase(database: RatingLabDatabase): Promise<void> {
    await mkdir(dirname(this.databasePath), { recursive: true });
    await writeFile(this.databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export const RatingStore = FileRatingStore;

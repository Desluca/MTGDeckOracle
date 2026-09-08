import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

import { updateEloRatings } from "./elo.js";
import type { CardComparison, MatchStrategy, RatingCard, RatingCardSeed, RatingLabDatabase, RatingLeaderboardPage } from "./ratingTypes.js";

const EMPTY_DATABASE: RatingLabDatabase = {
  cards: {},
  comparisons: [],
};

export interface RatingStore {
  getDatabase(): Promise<RatingLabDatabase>;
  upsertCard(card: RatingCard): Promise<RatingCard>;
  findCard(cardId: string): Promise<RatingCard | undefined>;
  findCardsWithRatings(): Promise<readonly RatingCard[]>;
  findLeaderboardCards(page: number, pageSize: number): Promise<RatingLeaderboardPage>;
  recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy, visitorId?: string): Promise<CardComparison>;
  applyRatingSeed(seedName: string, seedVersion: string, cards: readonly RatingCardSeed[]): Promise<boolean>;
}

export class FileRatingStore implements RatingStore {
  constructor(private readonly databasePath: string) {}

  async getDatabase(): Promise<RatingLabDatabase> {
    return this.readDatabase();
  }

  async upsertCard(card: RatingCard): Promise<RatingCard> {
    const database = await this.readDatabase();
    const existingCard = database.cards[card.id];
    const seededRating = database.metadata?.seededCardRatings?.[normalizeSeedLookupName(card.name)]?.rating;
    const nextCard = existingCard ? { ...card, rating: existingCard.rating, wins: existingCard.wins, losses: existingCard.losses } : { ...card, rating: seededRating ?? card.rating };

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

  async findLeaderboardCards(page: number, pageSize: number): Promise<RatingLeaderboardPage> {
    const database = await this.readDatabase();
    const cardsByNormalizedName = new Map(Object.values(database.cards).map((card) => [normalizeSeedLookupName(card.name), card]));

    for (const seed of Object.values(database.metadata?.seededCardRatings ?? {})) {
      if (!cardsByNormalizedName.has(seed.normalizedName)) {
        cardsByNormalizedName.set(seed.normalizedName, seedToLeaderboardCard(seed));
      }
    }

    const cards = [...cardsByNormalizedName.values()].sort(compareLeaderboardCards);
    const totalCards = cards.length;
    const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));
    const normalizedPage = Math.min(Math.max(page, 1), totalPages);
    const offset = (normalizedPage - 1) * pageSize;

    return {
      cards: cards.slice(offset, offset + pageSize),
      page: normalizedPage,
      pageSize,
      totalCards,
      totalPages,
    };
  }

  async recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy, visitorId?: string): Promise<CardComparison> {
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
      ...(visitorId ? { visitorId } : {}),
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

  async applyRatingSeed(seedName: string, seedVersion: string, cards: readonly RatingCardSeed[]): Promise<boolean> {
    const database = await this.readDatabase();

    if (database.metadata?.seedVersions?.[seedName] === seedVersion) {
      return false;
    }

    const seededCardRatings = mergeSeededCardRatings(database.metadata?.seededCardRatings ?? {}, Object.fromEntries(cards.map((card) => [card.normalizedName, card])));
    const nextCards = Object.fromEntries(
      Object.entries(database.cards).map(([cardId, card]) => {
        const seededRating = seededCardRatings[normalizeSeedLookupName(card.name)]?.rating;
        return [cardId, seededRating && card.wins + card.losses === 0 ? { ...card, rating: seededRating } : card];
      }),
    );

    await this.writeDatabase({
      ...database,
      cards: nextCards,
      metadata: {
        ...database.metadata,
        seedVersions: {
          ...database.metadata?.seedVersions,
          [seedName]: seedVersion,
        },
        seededCardRatings: {
          ...database.metadata?.seededCardRatings,
          ...seededCardRatings,
        },
      },
    });

    return true;
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

function normalizeSeedLookupName(name: string): string {
  return name.trim().toLowerCase();
}

function mergeSeededCardRatings(
  existingSeeds: Record<string, RatingCardSeed>,
  newSeeds: Record<string, RatingCardSeed>,
): Record<string, RatingCardSeed> {
  const mergedSeeds = { ...existingSeeds };

  for (const [normalizedName, seed] of Object.entries(newSeeds)) {
    const existingSeed = mergedSeeds[normalizedName];
    mergedSeeds[normalizedName] = !existingSeed || seed.rating > existingSeed.rating ? seed : existingSeed;
  }

  return mergedSeeds;
}

function seedToLeaderboardCard(seed: RatingCardSeed): RatingCard {
  return {
    id: `seed:${seed.normalizedName}`,
    name: seed.name,
    typeLine: "Seeded card",
    manaValue: 0,
    rating: seed.rating,
    wins: 0,
    losses: 0,
  };
}

function compareLeaderboardCards(left: RatingCard, right: RatingCard): number {
  return right.rating - left.rating || right.wins - left.wins || left.name.localeCompare(right.name);
}

export const RatingStore = FileRatingStore;

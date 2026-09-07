import { randomUUID } from "node:crypto";

import pg from "pg";

import { updateEloRatings } from "./elo.js";
import type { RatingStore } from "./ratingStore.js";
import type { CardComparison, MatchStrategy, RatingCard, RatingLabDatabase } from "./ratingTypes.js";

const { Pool } = pg;

interface RatingCardRow {
  readonly id: string;
  readonly oracle_id: string | null;
  readonly name: string;
  readonly type_line: string;
  readonly mana_value: number;
  readonly image_url: string | null;
  readonly scryfall_uri: string | null;
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
}

interface CardComparisonRow {
  readonly id: string;
  readonly winner_card_id: string;
  readonly loser_card_id: string;
  readonly winner_rating_before: number;
  readonly loser_rating_before: number;
  readonly winner_rating_after: number;
  readonly loser_rating_after: number;
  readonly strategy: MatchStrategy;
  readonly created_at: Date | string;
}

export class PostgresRatingStore implements RatingStore {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }

  async getDatabase(): Promise<RatingLabDatabase> {
    const [cardsResult, comparisonsResult] = await Promise.all([
      this.pool.query<RatingCardRow>("select * from rating_cards order by name asc"),
      this.pool.query<CardComparisonRow>("select * from rating_comparisons order by created_at asc"),
    ]);

    return {
      cards: Object.fromEntries(cardsResult.rows.map((row) => [row.id, mapCard(row)])),
      comparisons: comparisonsResult.rows.map(mapComparison),
    };
  }

  async upsertCard(card: RatingCard): Promise<RatingCard> {
    const result = await this.pool.query<RatingCardRow>(
      `
      insert into rating_cards (
        id, oracle_id, name, type_line, mana_value, image_url, scryfall_uri, rating, wins, losses
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      on conflict (id) do update set
        oracle_id = excluded.oracle_id,
        name = excluded.name,
        type_line = excluded.type_line,
        mana_value = excluded.mana_value,
        image_url = excluded.image_url,
        scryfall_uri = excluded.scryfall_uri
      returning *
      `,
      [
        card.id,
        card.oracleId ?? null,
        card.name,
        card.typeLine,
        card.manaValue,
        card.imageUrl ?? null,
        card.scryfallUri ?? null,
        card.rating,
        card.wins,
        card.losses,
      ],
    );

    return mapCard(requiredRow(result.rows[0]));
  }

  async findCard(cardId: string): Promise<RatingCard | undefined> {
    const result = await this.pool.query<RatingCardRow>("select * from rating_cards where id = $1", [cardId]);
    return result.rows[0] ? mapCard(result.rows[0]) : undefined;
  }

  async findCardsWithRatings(): Promise<readonly RatingCard[]> {
    const result = await this.pool.query<RatingCardRow>("select * from rating_cards");
    return result.rows.map(mapCard);
  }

  async recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy): Promise<CardComparison> {
    const client = await this.pool.connect();

    try {
      await client.query("begin");

      const cardsResult = await client.query<RatingCardRow>(
        "select * from rating_cards where id = any($1::text[]) for update",
        [[winnerCardId, loserCardId]],
      );
      const cards = Object.fromEntries(cardsResult.rows.map((row) => [row.id, mapCard(row)]));
      const winner = cards[winnerCardId];
      const loser = cards[loserCardId];

      if (!winner || !loser) {
        throw new Error("Cannot record vote for cards that are not in the rating database.");
      }

      const updatedRatings = updateEloRatings(winner.rating, loser.rating);
      const comparison: CardComparison = {
        id: randomUUID(),
        winnerCardId,
        loserCardId,
        winnerRatingBefore: winner.rating,
        loserRatingBefore: loser.rating,
        winnerRatingAfter: updatedRatings.winnerRating,
        loserRatingAfter: updatedRatings.loserRating,
        strategy,
        createdAt: new Date().toISOString(),
      };

      await client.query("update rating_cards set rating = $1, wins = wins + 1 where id = $2", [
        comparison.winnerRatingAfter,
        winnerCardId,
      ]);
      await client.query("update rating_cards set rating = $1, losses = losses + 1 where id = $2", [
        comparison.loserRatingAfter,
        loserCardId,
      ]);
      await client.query(
        `
        insert into rating_comparisons (
          id, winner_card_id, loser_card_id, winner_rating_before, loser_rating_before,
          winner_rating_after, loser_rating_after, strategy, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          comparison.id,
          comparison.winnerCardId,
          comparison.loserCardId,
          comparison.winnerRatingBefore,
          comparison.loserRatingBefore,
          comparison.winnerRatingAfter,
          comparison.loserRatingAfter,
          comparison.strategy,
          comparison.createdAt,
        ],
      );

      await client.query("commit");
      return comparison;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

function mapCard(row: RatingCardRow): RatingCard {
  return {
    id: row.id,
    ...(row.oracle_id ? { oracleId: row.oracle_id } : {}),
    name: row.name,
    typeLine: row.type_line,
    manaValue: row.mana_value,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    ...(row.scryfall_uri ? { scryfallUri: row.scryfall_uri } : {}),
    rating: row.rating,
    wins: row.wins,
    losses: row.losses,
  };
}

function mapComparison(row: CardComparisonRow): CardComparison {
  return {
    id: row.id,
    winnerCardId: row.winner_card_id,
    loserCardId: row.loser_card_id,
    winnerRatingBefore: row.winner_rating_before,
    loserRatingBefore: row.loser_rating_before,
    winnerRatingAfter: row.winner_rating_after,
    loserRatingAfter: row.loser_rating_after,
    strategy: row.strategy,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function requiredRow<T>(row: T | undefined): T {
  if (!row) {
    throw new Error("PostgreSQL query did not return the expected row.");
  }

  return row;
}

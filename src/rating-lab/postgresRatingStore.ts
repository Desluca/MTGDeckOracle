import { randomUUID } from "node:crypto";

import pg from "pg";

import { updateEloRatings } from "./elo.js";
import type { RatingStore } from "./ratingStore.js";
import type { CardComparison, MatchStrategy, RatingCard, RatingCardSeed, RatingLabDatabase, RatingLeaderboardPage } from "./ratingTypes.js";

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
  readonly visitor_id: string | null;
  readonly created_at: Date | string;
}

interface SeedVersionRow {
  readonly seed_version: string;
}

export class PostgresRatingStore implements RatingStore {
  private readonly pool: pg.Pool;
  private schemaInitialization?: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }

  async getDatabase(): Promise<RatingLabDatabase> {
    await this.ensureSchema();

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
    await this.ensureSchema();

    const result = await this.pool.query<RatingCardRow>(
      `
      insert into rating_cards (
        id, oracle_id, name, type_line, mana_value, image_url, scryfall_uri, rating, wins, losses
      )
      values (
        $1, $2, $3, $4, $5, $6, $7,
        coalesce((select max(rating) from rating_card_seeds where normalized_name = $11), $8),
        $9, $10
      )
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
        normalizeSeedLookupName(card.name),
      ],
    );

    return mapCard(requiredRow(result.rows[0]));
  }

  async findCard(cardId: string): Promise<RatingCard | undefined> {
    await this.ensureSchema();

    const result = await this.pool.query<RatingCardRow>("select * from rating_cards where id = $1", [cardId]);
    return result.rows[0] ? mapCard(result.rows[0]) : undefined;
  }

  async findCardsWithRatings(): Promise<readonly RatingCard[]> {
    await this.ensureSchema();

    const result = await this.pool.query<RatingCardRow>("select * from rating_cards");
    return result.rows.map(mapCard);
  }

  async findLeaderboardCards(page: number, pageSize: number): Promise<RatingLeaderboardPage> {
    await this.ensureSchema();

    const totalResult = await this.pool.query<{ count: string }>(`
      with seed_cards as (
        select normalized_name
        from rating_card_seeds
        group by normalized_name
      )
      select (
        (select count(*) from rating_cards) +
        (select count(*) from seed_cards where not exists (
          select 1 from rating_cards where lower(rating_cards.name) = seed_cards.normalized_name
        ))
      ) as count
    `);
    const totalCards = Number.parseInt(totalResult.rows[0]?.count ?? "0", 10);
    const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));
    const normalizedPage = Math.min(Math.max(page, 1), totalPages);
    const offset = (normalizedPage - 1) * pageSize;
    const cardsResult = await this.pool.query<RatingCardRow>(
      `
      with seed_cards as (
        select
          normalized_name,
          (array_agg(name order by rating desc, name asc))[1] as name,
          max(rating) as rating
        from rating_card_seeds
        group by normalized_name
      ),
      leaderboard_cards as (
        select id, oracle_id, name, type_line, mana_value, image_url, scryfall_uri, rating, wins, losses
        from rating_cards

        union all

        select
          'seed:' || seed_cards.normalized_name as id,
          null as oracle_id,
          seed_cards.name,
          'Seeded card' as type_line,
          0 as mana_value,
          null as image_url,
          null as scryfall_uri,
          seed_cards.rating,
          0 as wins,
          0 as losses
        from seed_cards
        where not exists (
          select 1 from rating_cards where lower(rating_cards.name) = seed_cards.normalized_name
        )
      )
      select *
      from leaderboard_cards
      order by rating desc, wins desc, name asc
      limit $1 offset $2
      `,
      [pageSize, offset],
    );

    return {
      cards: cardsResult.rows.map(mapCard),
      page: normalizedPage,
      pageSize,
      totalCards,
      totalPages,
    };
  }

  async recordVote(winnerCardId: string, loserCardId: string, strategy: MatchStrategy, visitorId?: string): Promise<CardComparison> {
    await this.ensureSchema();

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
        ...(visitorId ? { visitorId } : {}),
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
          winner_rating_after, loser_rating_after, strategy, visitor_id, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
          comparison.visitorId ?? null,
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

  async applyRatingSeed(seedName: string, seedVersion: string, cards: readonly RatingCardSeed[]): Promise<boolean> {
    await this.ensureSchema();

    const client = await this.pool.connect();

    try {
      await client.query("begin");

      const currentSeed = await client.query<SeedVersionRow>(
        "select seed_version from rating_seed_state where seed_name = $1 for update",
        [seedName],
      );

      if (currentSeed.rows[0]?.seed_version === seedVersion) {
        await client.query("commit");
        return false;
      }

      await client.query("delete from rating_card_seeds where seed_name = $1", [seedName]);

      await client.query(
        `
        insert into rating_card_seeds (seed_name, seed_version, normalized_name, name, rating)
        select $1, $2, seed.normalized_name, seed.name, seed.rating
        from jsonb_to_recordset($3::jsonb) as seed(normalized_name text, name text, rating integer)
        on conflict (seed_name, normalized_name) do update set
          seed_version = excluded.seed_version,
          name = excluded.name,
          rating = excluded.rating
        `,
        [
          seedName,
          seedVersion,
          JSON.stringify(cards.map((card) => ({ normalized_name: card.normalizedName, name: card.name, rating: card.rating }))),
        ],
      );

      await client.query(
        `
        update rating_cards
        set rating = seed_ratings.rating
        from (
          select normalized_name, max(rating) as rating
          from rating_card_seeds
          group by normalized_name
        ) as seed_ratings
        where lower(rating_cards.name) = seed_ratings.normalized_name
          and rating_cards.wins + rating_cards.losses = 0
        `,
      );

      await client.query(
        `
        insert into rating_seed_state (seed_name, seed_version, applied_at)
        values ($1, $2, now())
        on conflict (seed_name) do update set
          seed_version = excluded.seed_version,
          applied_at = excluded.applied_at
        `,
        [seedName, seedVersion],
      );

      await client.query("commit");
      return true;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureSchema(): Promise<void> {
    this.schemaInitialization ??= this.pool.query(`
      create table if not exists rating_cards (
        id text primary key,
        oracle_id text,
        name text not null,
        type_line text not null,
        mana_value numeric not null,
        image_url text,
        scryfall_uri text,
        rating integer not null default 1500,
        wins integer not null default 0,
        losses integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists rating_comparisons (
        id text primary key,
        winner_card_id text not null references rating_cards(id) on delete restrict,
        loser_card_id text not null references rating_cards(id) on delete restrict,
        winner_rating_before integer not null,
        loser_rating_before integer not null,
        winner_rating_after integer not null,
        loser_rating_after integer not null,
        strategy text not null check (strategy in ('random', 'similar_rating')),
        visitor_id text,
        created_at timestamptz not null default now()
      );

      alter table rating_comparisons
      add column if not exists visitor_id text;

      create index if not exists rating_cards_rating_idx on rating_cards (rating);
      create index if not exists rating_comparisons_created_at_idx on rating_comparisons (created_at);
      create index if not exists rating_comparisons_visitor_id_idx on rating_comparisons (visitor_id);

      create table if not exists rating_card_seeds (
        seed_name text not null,
        seed_version text not null,
        normalized_name text not null,
        name text not null,
        rating integer not null,
        created_at timestamptz not null default now(),
        primary key (seed_name, normalized_name)
      );

      create table if not exists rating_seed_state (
        seed_name text primary key,
        seed_version text not null,
        applied_at timestamptz not null default now()
      );

      create or replace function set_rating_cards_updated_at()
      returns trigger as $$
      begin
        new.updated_at = now();
        return new;
      end;
      $$ language plpgsql;

      drop trigger if exists rating_cards_set_updated_at on rating_cards;
      create trigger rating_cards_set_updated_at
      before update on rating_cards
      for each row
      execute function set_rating_cards_updated_at();
    `).then(() => undefined);

    return this.schemaInitialization;
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
    ...(row.visitor_id ? { visitorId: row.visitor_id } : {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function requiredRow<T>(row: T | undefined): T {
  if (!row) {
    throw new Error("PostgreSQL query did not return the expected row.");
  }

  return row;
}

function normalizeSeedLookupName(name: string): string {
  return name.trim().toLowerCase();
}

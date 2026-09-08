import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { RatingStore } from "./ratingStore.js";
import type { RatingCardSeed } from "./ratingTypes.js";

const BEST_CARD_SEED_NAME = "bestcard";
const BEST_CARD_SEED_RATING = 1600;
const TOP_COMMANDER_STAPLES_SEED_NAME = "topCommanderStaples";
const TOP_COMMANDER_STAPLES_MAX_RATING = 2100;
const TOP_COMMANDER_STAPLES_MIN_RATING = 1600;

export interface BestCardSeedResult {
  readonly seedName?: string;
  readonly applied: boolean;
  readonly cards: number;
  readonly seedVersion?: string;
}

export async function applyConfiguredRatingSeeds(store: RatingStore): Promise<readonly BestCardSeedResult[]> {
  return Promise.all([
    applyBestCardRatingSeed(store),
    applyTopCommanderStaplesRatingSeed(store),
  ]);
}

export async function applyBestCardRatingSeed(store: RatingStore, filePath = join(process.cwd(), "bestcard.txt")): Promise<BestCardSeedResult> {
  return applyRatingSeedFile(store, BEST_CARD_SEED_NAME, filePath, parseBestCardRanking);
}

export async function applyTopCommanderStaplesRatingSeed(
  store: RatingStore,
  filePath = join(process.cwd(), "topCommanderStaples.txt"),
): Promise<BestCardSeedResult> {
  return applyRatingSeedFile(store, TOP_COMMANDER_STAPLES_SEED_NAME, filePath, parseTopCommanderStaplesRanking);
}

async function applyRatingSeedFile(
  store: RatingStore,
  seedName: string,
  filePath: string,
  parser: (rawRanking: string) => readonly RatingCardSeed[],
): Promise<BestCardSeedResult> {
  let rawFile: string;

  try {
    rawFile = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return { seedName, applied: false, cards: 0 };
    }

    throw error;
  }

  const cards = parser(rawFile);
  const seedVersion = createHash("sha256")
    .update(cards.map((card) => `${card.name}:${card.rating}`).join("\n"))
    .digest("hex");

  const applied = await store.applyRatingSeed(seedName, seedVersion, cards);
  return {
    seedName,
    applied,
    cards: cards.length,
    seedVersion,
  };
}

export function parseBestCardRanking(rawRanking: string): readonly RatingCardSeed[] {
  const cardNames = dedupePreservingOrder(rawRanking.split(/\r?\n/).map((line) => line.trim()).filter(isLikelyCardName));

  return cardNames.map((name) => ({
    normalizedName: normalizeSeedLookupName(name),
    name,
    rating: BEST_CARD_SEED_RATING,
  }));
}

export function parseTopCommanderStaplesRanking(rawRanking: string): readonly RatingCardSeed[] {
  const cardNames = dedupePreservingOrder(rawRanking.split(/\r?\n/).map((line) => line.trim()).filter(isLikelyCardName));

  return cardNames.map((name, index) => ({
    normalizedName: normalizeSeedLookupName(name),
    name,
    rating: scaledRating(index, cardNames.length),
  }));
}

function scaledRating(index: number, totalCards: number): number {
  if (totalCards <= 1) {
    return TOP_COMMANDER_STAPLES_MAX_RATING;
  }

  const step = (TOP_COMMANDER_STAPLES_MAX_RATING - TOP_COMMANDER_STAPLES_MIN_RATING) / (totalCards - 1);
  return Math.round(TOP_COMMANDER_STAPLES_MAX_RATING - index * step);
}

function dedupePreservingOrder(values: readonly string[]): readonly string[] {
  const seenNames = new Set<string>();
  const dedupedValues: string[] = [];

  for (const value of values) {
    const normalizedName = normalizeSeedLookupName(value);

    if (seenNames.has(normalizedName)) {
      continue;
    }

    seenNames.add(normalizedName);
    dedupedValues.push(value);
  }

  return dedupedValues;
}

function isLikelyCardName(line: string): boolean {
  if (!line || line.length > 120) {
    return false;
  }

  if (/[$€%]/.test(line) || /\bdecks?\b/i.test(line) || line.toLowerCase() === "inclusion") {
    return false;
  }

  return /[a-z]/i.test(line);
}

function normalizeSeedLookupName(name: string): string {
  return name.trim().toLowerCase();
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

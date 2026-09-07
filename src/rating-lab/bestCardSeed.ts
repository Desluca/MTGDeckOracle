import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { RatingStore } from "./ratingStore.js";
import type { RatingCardSeed } from "./ratingTypes.js";

const BEST_CARD_SEED_NAME = "bestcard";
const BEST_CARD_SEED_RATING = 1600;

export interface BestCardSeedResult {
  readonly applied: boolean;
  readonly cards: number;
  readonly seedVersion?: string;
}

export async function applyBestCardRatingSeed(store: RatingStore, filePath = join(process.cwd(), "bestcard.txt")): Promise<BestCardSeedResult> {
  let rawFile: string;

  try {
    rawFile = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return { applied: false, cards: 0 };
    }

    throw error;
  }

  const cards = parseBestCardRanking(rawFile);
  const seedVersion = createHash("sha256")
    .update(cards.map((card) => `${card.name}:${card.rating}`).join("\n"))
    .digest("hex");

  const applied = await store.applyRatingSeed(BEST_CARD_SEED_NAME, seedVersion, cards);
  return {
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

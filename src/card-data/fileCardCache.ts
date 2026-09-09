import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Card } from "../domain/index.js";
import { cardLookupKeys, expandCardLookupMap, normalizeLookupName, type CardCache } from "./cardDataSource.js";

type SerializedCache = Record<string, Card>;

export class FileCardCache implements CardCache {
  constructor(private readonly cacheFilePath: string) {}

  async get(normalizedName: string): Promise<Card | undefined> {
    const cache = await this.readCache();
    return findCachedCard(cache, normalizedName);
  }

  async set(normalizedName: string, card: Card): Promise<void> {
    const cache = await this.readCache();
    cache[normalizeLookupName(normalizedName)] = card;
    for (const key of cardLookupKeys(card)) {
      cache[key] = card;
    }
    await this.writeCache(cache);
  }

  async getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const cache = await this.readCache();
    const found = new Map<string, Card>();

    for (const normalizedName of normalizedNames) {
      const card = findCachedCard(cache, normalizedName);
      if (card) {
        found.set(normalizeLookupName(normalizedName), card);
      }
    }

    return found;
  }

  async setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void> {
    const cache = await this.readCache();

    for (const [normalizedName, card] of expandCardLookupMap(cardsByNormalizedName).entries()) {
      cache[normalizeLookupName(normalizedName)] = card;
    }

    await this.writeCache(cache);
  }

  private async readCache(): Promise<SerializedCache> {
    try {
      const rawCache = await readFile(this.cacheFilePath, "utf8");
      return JSON.parse(rawCache) as SerializedCache;
    } catch (error) {
      if (isMissingFileError(error)) {
        return {};
      }

      throw error;
    }
  }

  private async writeCache(cache: SerializedCache): Promise<void> {
    await mkdir(dirname(this.cacheFilePath), { recursive: true });
    await writeFile(this.cacheFilePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }
}

function findCachedCard(cache: SerializedCache, cardName: string): Card | undefined {
  const normalizedName = normalizeLookupName(cardName);
  const direct = cache[normalizedName];

  if (direct) {
    return direct;
  }

  return Object.values(cache).find((card) => cardLookupKeys(card).includes(normalizedName));
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

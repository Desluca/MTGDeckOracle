import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Card } from "../domain/index.js";
import type { CardCache } from "./cardDataSource.js";

type SerializedCache = Record<string, Card>;

export class FileCardCache implements CardCache {
  constructor(private readonly cacheFilePath: string) {}

  async get(normalizedName: string): Promise<Card | undefined> {
    const cache = await this.readCache();
    return cache[normalizedName];
  }

  async set(normalizedName: string, card: Card): Promise<void> {
    const cache = await this.readCache();
    cache[normalizedName] = card;
    await this.writeCache(cache);
  }

  async getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>> {
    const cache = await this.readCache();
    const found = new Map<string, Card>();

    for (const normalizedName of normalizedNames) {
      const card = cache[normalizedName];
      if (card) {
        found.set(normalizedName, card);
      }
    }

    return found;
  }

  async setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void> {
    const cache = await this.readCache();

    for (const [normalizedName, card] of cardsByNormalizedName.entries()) {
      cache[normalizedName] = card;
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

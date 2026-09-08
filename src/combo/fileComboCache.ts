import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { KnownCombo } from "../domain/index.js";
import type { ComboCache } from "./comboCache.js";

interface SerializedComboCache {
  readonly catalog?: readonly KnownCombo[];
  readonly byCard?: Record<string, readonly KnownCombo[]>;
}

export class FileComboCache implements ComboCache {
  private memory: SerializedComboCache | undefined;

  constructor(private readonly cacheFilePath: string) {}

  async getCatalog(): Promise<readonly KnownCombo[] | undefined> {
    const cache = await this.readCache();
    return cache.catalog && cache.catalog.length > 0 ? cache.catalog : undefined;
  }

  async setCatalog(combos: readonly KnownCombo[]): Promise<void> {
    const cache = await this.readCache();
    await this.writeCache({
      ...cache,
      catalog: combos,
    });
  }

  async getManyByCard(normalizedNames: readonly string[]): Promise<{
    readonly found: ReadonlyMap<string, readonly KnownCombo[]>;
    readonly missing: readonly string[];
  }> {
    const cache = await this.readCache();
    const found = new Map<string, readonly KnownCombo[]>();
    const missing: string[] = [];

    for (const normalizedName of normalizedNames) {
      const combos = cache.byCard?.[normalizedName];
      if (combos) {
        found.set(normalizedName, combos);
      } else {
        missing.push(normalizedName);
      }
    }

    return { found, missing };
  }

  async setManyByCard(combosByCard: ReadonlyMap<string, readonly KnownCombo[]>): Promise<void> {
    const cache = await this.readCache();
    const byCard = { ...cache.byCard };

    for (const [normalizedName, combos] of combosByCard.entries()) {
      byCard[normalizedName] = combos;
    }

    await this.writeCache({
      ...cache,
      byCard,
    });
  }

  private async readCache(): Promise<SerializedComboCache> {
    if (this.memory) {
      return this.memory;
    }

    try {
      const rawCache = await readFile(this.cacheFilePath, "utf8");
      this.memory = JSON.parse(rawCache) as SerializedComboCache;
      return this.memory;
    } catch (error) {
      if (isMissingFileError(error)) {
        this.memory = {};
        return this.memory;
      }

      throw error;
    }
  }

  private async writeCache(cache: SerializedComboCache): Promise<void> {
    this.memory = cache;
    await mkdir(dirname(this.cacheFilePath), { recursive: true });
    await writeFile(this.cacheFilePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

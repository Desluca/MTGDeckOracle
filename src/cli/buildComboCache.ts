import { join } from "node:path";

import { CommanderSpellbookComboDataProvider, FileComboCache } from "../combo/index.js";

const DEFAULT_CACHE_PATH = join(process.cwd(), ".cache", "commander-spellbook-combos.json");

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const cache = new FileComboCache(options.cacheFilePath);
  const provider = new CommanderSpellbookComboDataProvider({ cache });
  const combos = await provider.findAllCombos({
    pageSize: options.pageSize,
    maxPages: options.maxPages,
    delayMs: options.delayMs,
    refreshCatalog: true,
  });

  console.log(`Wrote ${combos.length} combos to ${options.cacheFilePath}`);
}

await main();

interface BuildComboCacheOptions {
  readonly cacheFilePath: string;
  readonly pageSize: number;
  readonly maxPages: number;
  readonly delayMs: number;
}

function parseOptions(args: readonly string[]): BuildComboCacheOptions {
  return {
    cacheFilePath: readFlag(args, "--output") ?? DEFAULT_CACHE_PATH,
    pageSize: parsePositiveInteger(readFlag(args, "--page-size"), 100),
    maxPages: parsePositiveInteger(readFlag(args, "--max-pages"), Number.POSITIVE_INFINITY),
    delayMs: parsePositiveInteger(readFlag(args, "--delay-ms"), 200),
  };
}

function readFlag(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

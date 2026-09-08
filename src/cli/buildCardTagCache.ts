import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { ScryfallBulkCardSource } from "../card-data/index.js";
import type { Card } from "../domain/index.js";
import { buildOracleCardTagSnapshot } from "../tagging/index.js";

type CardTagCacheSource = "cache" | "scryfall-bulk";

interface BuildCardTagCacheOptions {
  readonly source: CardTagCacheSource;
  readonly cardsFilePath: string;
  readonly outputFilePath: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const cards = await loadCards(options);
  const snapshot = buildOracleCardTagSnapshot(cards);

  await mkdir(dirname(options.outputFilePath), { recursive: true });
  await writeFile(options.outputFilePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Wrote ${snapshot.cards?.length ?? 0} tagged cards to ${options.outputFilePath}`);
}

await main();

function parseOptions(args: readonly string[]): BuildCardTagCacheOptions {
  return {
    source: parseSource(readFlag(args, "--source")),
    cardsFilePath: readFlag(args, "--cards") ?? join(process.cwd(), ".cache", "scryfall-cards.json"),
    outputFilePath: readFlag(args, "--output") ?? join(process.cwd(), ".cache", "external-card-tags.json"),
  };
}

function parseSource(source: string | undefined): CardTagCacheSource {
  if (source === "scryfall-bulk") {
    return source;
  }

  return "cache";
}

function readFlag(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

async function loadCachedCards(cardsFilePath: string): Promise<readonly Card[]> {
  const rawCards = await readFile(cardsFilePath, "utf8");
  const parsed = JSON.parse(rawCards) as Record<string, Card>;

  return Object.values(parsed);
}

async function loadCards(options: BuildCardTagCacheOptions): Promise<readonly Card[]> {
  if (options.source === "scryfall-bulk") {
    return new ScryfallBulkCardSource().findCommanderLegalCards();
  }

  return loadCachedCards(options.cardsFilePath);
}

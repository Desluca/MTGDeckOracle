import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { ScryfallBulkCardSource } from "../card-data/index.js";
import type { Card } from "../domain/index.js";
import { buildOracleCardTagSnapshot, mergeCardTagSnapshots, type ExternalCardTagFile } from "../tagging/index.js";

type CardTagCacheSource = "cache" | "scryfall-bulk";

interface BuildCardTagCacheOptions {
  readonly source: CardTagCacheSource;
  readonly cardsFilePath: string;
  readonly outputFilePath: string;
  readonly mergeExisting: boolean;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const cards = await loadCards(options);
  const snapshot = buildOracleCardTagSnapshot(cards);
  const existingSnapshot = options.mergeExisting ? await loadExistingSnapshot(options.outputFilePath) : undefined;
  const outputSnapshot = existingSnapshot ? mergeCardTagSnapshots([existingSnapshot, snapshot]) : snapshot;

  await mkdir(dirname(options.outputFilePath), { recursive: true });
  await writeFile(options.outputFilePath, `${JSON.stringify(outputSnapshot, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputSnapshot.cards?.length ?? 0} tagged cards to ${options.outputFilePath}`);
}

await main();

function parseOptions(args: readonly string[]): BuildCardTagCacheOptions {
  return {
    source: parseSource(readFlag(args, "--source")),
    cardsFilePath: readFlag(args, "--cards") ?? join(process.cwd(), ".cache", "scryfall-cards.json"),
    outputFilePath: readFlag(args, "--output") ?? join(process.cwd(), ".cache", "external-card-tags.json"),
    mergeExisting: !hasFlag(args, "--replace"),
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

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
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

async function loadExistingSnapshot(outputFilePath: string): Promise<ExternalCardTagFile | undefined> {
  try {
    const rawSnapshot = await readFile(outputFilePath, "utf8");
    return JSON.parse(rawSnapshot) as ExternalCardTagFile;
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

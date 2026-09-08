import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { ScryfallBulkCardSource } from "../card-data/index.js";
import { CommanderSpellbookComboDataProvider } from "../combo/index.js";
import type { Card } from "../domain/index.js";
import {
  buildComboCardTagSnapshot,
  buildOracleCardTagSnapshot,
  mergeCardTagSnapshots,
  type ExternalCardTagFile,
} from "../tagging/index.js";

type CardTagCacheSource = "cache" | "scryfall-bulk" | "spellbook";

interface BuildCardTagCacheOptions {
  readonly source: CardTagCacheSource;
  readonly cardsFilePath: string;
  readonly outputFilePath: string;
  readonly importFilePaths: readonly string[];
  readonly mergeExisting: boolean;
  readonly pageSize: number;
  readonly maxPages: number;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const snapshots: ExternalCardTagFile[] = [];

  if (options.mergeExisting) {
    const existingSnapshot = await loadExistingSnapshot(options.outputFilePath);
    if (existingSnapshot) {
      snapshots.push(existingSnapshot);
    }
  }

  snapshots.push(await buildSourceSnapshot(options));

  for (const importFilePath of options.importFilePaths) {
    snapshots.push(await loadSnapshotFile(importFilePath));
  }

  const outputSnapshot = mergeCardTagSnapshots(snapshots);

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
    importFilePaths: readRepeatedFlag(args, "--import"),
    mergeExisting: !hasFlag(args, "--replace"),
    pageSize: parsePositiveInteger(readFlag(args, "--page-size"), 100),
    maxPages: parsePositiveInteger(readFlag(args, "--max-pages"), 200),
  };
}

function parseSource(source: string | undefined): CardTagCacheSource {
  if (source === "scryfall-bulk" || source === "spellbook") {
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

function readRepeatedFlag(args: readonly string[], flag: string): readonly string[] {
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag) {
      const value = args[index + 1];
      if (value) {
        values.push(value);
      }
    }
  }

  return values;
}

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function buildSourceSnapshot(options: BuildCardTagCacheOptions): Promise<ExternalCardTagFile> {
  if (options.source === "spellbook") {
    const combos = await new CommanderSpellbookComboDataProvider().findAllCombos({
      pageSize: options.pageSize,
      maxPages: options.maxPages,
      delayMs: 200,
    });
    return buildComboCardTagSnapshot(combos);
  }

  const cards = await loadCards(options);
  return buildOracleCardTagSnapshot(cards);
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
    return await loadSnapshotFile(outputFilePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

async function loadSnapshotFile(filePath: string): Promise<ExternalCardTagFile> {
  const rawSnapshot = await readFile(filePath, "utf8");
  return JSON.parse(rawSnapshot) as ExternalCardTagFile;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

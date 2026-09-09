import { readFile } from "node:fs/promises";

import { parseAnalyzeDeckCliOptions } from "./cliOptions.js";
import { analyzeCommanderDeck, createAnalyzeRuntime } from "../pipeline/index.js";
import { renderReport } from "../report/index.js";

async function main(): Promise<void> {
  const options = parseAnalyzeDeckCliOptions(process.argv.slice(2));

  if (!options.deckFilePath) {
    console.error("Usage: npm run analyze -- <decklist-file> [--format json|markdown|html] [--offline] [--notes \"text\"]");
    process.exitCode = 1;
    return;
  }

  const rawText = await readFile(options.deckFilePath, "utf8");
  const offline = options.offline || process.env.MTG_DECK_ORACLE_OFFLINE === "1";
  const runtime = await createAnalyzeRuntime({
    offline,
    cardRatings: options.cardRatings,
  });
  const result = await analyzeCommanderDeck({
    rawText,
    sourceUrl: options.deckFilePath,
    cardDataSource: runtime.cardDataSource,
    comboDataProvider: runtime.comboDataProvider,
    ...(runtime.tagProvider ? { tagProvider: runtime.tagProvider } : {}),
    ...(runtime.ratingProvider ? { ratingProvider: runtime.ratingProvider } : {}),
    ...(options.scoreNotes ? { scoreNotes: options.scoreNotes } : {}),
  });

  if (!result.ok) {
    console.log(JSON.stringify({ parsedDeck: result.parsedDeck, legality: result.legality, unresolvedNames: result.unresolvedNames }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(renderReport(result.report, options.format));
}

await main();

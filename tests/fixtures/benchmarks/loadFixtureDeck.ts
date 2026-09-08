import { readFileSync } from "node:fs";
import { join } from "node:path";

import { uniqueNormalizedNames } from "../../../src/card-data/index.js";
import { detectCombo, evaluateDetectedCombos } from "../../../src/combo/index.js";
import { resolveDeckListFromMap } from "../../../src/deck/index.js";
import { parseDeckList } from "../../../src/parser/index.js";
import { tagDeckCards } from "../../../src/tagging/index.js";
import { validateCommanderDeck } from "../../../src/validation/index.js";
import { createCardMap } from "../../utils/cardFactory.js";
import { stapleCards } from "../cards/stapleCards.js";
import { fixtureCombos } from "../combos/fixtureCombos.js";
import type { ScoringBenchmark } from "./benchmarkTypes.js";

const realDecksPath = join(process.cwd(), "tests", "fixtures", "decks", "real");

export function loadRealDeckBenchmark(
  id: string,
  fileName: string,
  description: string,
  expectedScoreRange: ScoringBenchmark["expectedScoreRange"],
  expectedBracket?: ScoringBenchmark["expectedBracket"],
): ScoringBenchmark {
  const parsed = parseDeckList(readFileSync(join(realDecksPath, fileName), "utf8"), {
    sourceType: "plain_text",
    sourceUrl: fileName,
  });
  const cardsByNormalizedName = createCardMap(stapleCards);
  const resolution = resolveDeckListFromMap(parsed, cardsByNormalizedName);

  if (!resolution.deck) {
    throw new Error(`Unresolved cards in ${fileName}: ${resolution.unresolvedNames.join(", ")}`);
  }

  const deck = tagDeckCards(resolution.deck);
  const availableNames = new Set(uniqueNormalizedNames(deck.cards.map((deckCard) => deckCard.card.identity.normalizedName)));
  const detectedCombos = fixtureCombos.map((combo) => detectCombo(combo, availableNames)).filter((combo) => combo.presentPieces.length > 0);
  const comboEvaluations = evaluateDetectedCombos(detectedCombos, deck);
  const legality = validateCommanderDeck(parsed, { cardsByNormalizedName });

  return {
    id,
    description,
    deck,
    legality,
    ...(comboEvaluations.length > 0 ? { comboEvaluations } : {}),
    ...(detectedCombos.length > 0 ? { detectedCombos } : {}),
    expectedScoreRange,
    ...(expectedBracket !== undefined ? { expectedBracket } : {}),
  };
}

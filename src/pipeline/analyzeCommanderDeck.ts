import { analyzeDeckStructure } from "../analysis/index.js";
import type { CardDataSource } from "../card-data/index.js";
import { detectDeckCombos, evaluateDetectedCombos, type ComboDataProvider } from "../combo/index.js";
import { analyzeConsistency } from "../consistency/index.js";
import { resolveDeckList } from "../deck/index.js";
import { generateDeckScoreExplanation } from "../explanation/index.js";
import { parseDeckList, type ParsedDeck } from "../parser/index.js";
import type { CardRatingProvider } from "../ratings/index.js";
import { recommendDeckImprovements } from "../recommendations/index.js";
import type { DeckReport } from "../report/index.js";
import { scoreCommanderDeck } from "../scoring/index.js";
import { createComboTagsByName, tagDeckCards, tagDeckCardsWithProvider, type CardTagProvider } from "../tagging/index.js";
import { validateCommanderDeck } from "../validation/index.js";
import type { CommanderLegalityReport } from "../domain/index.js";

export interface AnalyzeCommanderDeckInput {
  readonly rawText: string;
  readonly sourceUrl?: string;
  readonly cardDataSource: CardDataSource;
  readonly comboDataProvider: ComboDataProvider;
  readonly tagProvider?: CardTagProvider;
  readonly ratingProvider?: CardRatingProvider;
  readonly scoreNotes?: string;
}

export type AnalyzeCommanderDeckResult =
  | {
      readonly ok: true;
      readonly report: DeckReport;
    }
  | {
      readonly ok: false;
      readonly parsedDeck: ParsedDeck;
      readonly legality: CommanderLegalityReport;
      readonly unresolvedNames: readonly string[];
    };

export async function analyzeCommanderDeck(input: AnalyzeCommanderDeckInput): Promise<AnalyzeCommanderDeckResult> {
  const parsedDeck = parseDeckList(input.rawText, {
    sourceType: "plain_text",
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
  });
  const resolution = await resolveDeckList(parsedDeck, input.cardDataSource);
  const legality = validateCommanderDeck(parsedDeck, {
    cardsByNormalizedName: resolution.cardsByNormalizedName,
  });

  if (!resolution.deck) {
    return {
      ok: false,
      parsedDeck,
      legality,
      unresolvedNames: resolution.unresolvedNames,
    };
  }

  const baseTaggedDeck = input.tagProvider
    ? await tagDeckCardsWithProvider(resolution.deck, input.tagProvider)
    : tagDeckCards(resolution.deck);
  const detectedCombos = await detectDeckCombos(baseTaggedDeck, input.comboDataProvider);
  const taggedDeck = tagDeckCards(baseTaggedDeck, createComboTagsByName(detectedCombos));
  const structure = analyzeDeckStructure(taggedDeck);
  const consistency = analyzeConsistency(taggedDeck);
  const comboEvaluations = evaluateDetectedCombos(detectedCombos, taggedDeck);
  const score = scoreCommanderDeck({
    deck: taggedDeck,
    legality,
    comboEvaluations,
    detectedCombos,
    consistency,
    ...(input.ratingProvider ? { ratingProvider: input.ratingProvider } : {}),
    ...(input.scoreNotes ? { scoreNotes: input.scoreNotes } : {}),
  });
  const explanation = generateDeckScoreExplanation({
    score,
    legality,
    structure,
    consistency,
    comboEvaluations,
    deck: taggedDeck,
    ...(input.scoreNotes ? { scoreNotes: score.explanation } : {}),
  });
  const detailedRecommendations = recommendDeckImprovements(taggedDeck, structure);

  return {
    ok: true,
    report: {
      legality,
      structure,
      consistency,
      detectedCombos,
      comboEvaluations,
      score,
      explanation,
      detailedRecommendations,
    },
  };
}

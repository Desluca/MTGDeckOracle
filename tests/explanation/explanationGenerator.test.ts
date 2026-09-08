import { describe, expect, it } from "vitest";

import { analyzeDeckStructure } from "../../src/analysis/index.js";
import { analyzeConsistency } from "../../src/consistency/index.js";
import { generateDeckScoreExplanation } from "../../src/explanation/index.js";
import { scoreCommanderDeck } from "../../src/scoring/index.js";
import type { CommanderLegalityReport, ComboEvaluation } from "../../src/domain/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("generateDeckScoreExplanation", () => {
  it("generates summary and recommendations for a legal deck", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Plains" }), 37),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 10),
      ],
    });
    const legality = legalReport();
    const structure = analyzeDeckStructure(deck);
    const consistency = analyzeConsistency(deck);
    const score = scoreCommanderDeck({ deck, legality, consistency });

    const explanation = generateDeckScoreExplanation({ score, legality, structure, consistency });

    expect(explanation.summary).toContain(`${score.finalScore}/100`);
    expect(explanation.summary).toContain("Bracket");
    expect(explanation.scoreNotes).toContain(`${score.finalScore}/100`);
    expect(explanation.summary).toContain("Accesso solido a terre nei primi turni");
    expect(explanation.summary).toContain("Debole su");
    expect(explanation.recommendations.length).toBeGreaterThan(0);
    expect(
      explanation.recommendations.some(
        (recommendation) => recommendation.includes("ramp") || recommendation.includes("win condition"),
      ),
    ).toBe(true);
  });

  it("calls out legality problems", () => {
    const deck = createResolvedTestDeck();
    const legality: CommanderLegalityReport = {
      isLegal: false,
      legalityCap: 30,
      issues: [
        {
          code: "missing_commander",
          severity: "blocking",
          message: "Missing commander.",
        },
      ],
    };
    const structure = analyzeDeckStructure(deck);
    const consistency = analyzeConsistency(deck);
    const score = scoreCommanderDeck({ deck, legality, consistency });

    const explanation = generateDeckScoreExplanation({ score, legality, structure, consistency });

    expect(explanation.summary).toContain("problemi di legalita'");
    expect(explanation.weaknesses.some((weakness) => weakness.includes("Legalita'"))).toBe(true);
  });

  it("highlights strong combo evaluations", () => {
    const deck = createResolvedTestDeck();
    const legality = legalReport();
    const structure = analyzeDeckStructure(deck);
    const consistency = analyzeConsistency(deck);
    const comboEvaluations: readonly ComboEvaluation[] = [
      {
        detectedComboId: "combo-1",
        impactScore: 90,
        speed: "instant",
        totalManaValue: 4,
        commanderRole: "piece",
        tutorAccessScore: 50,
        protectionScore: 30,
        fragilityScore: 20,
        explanation: "Strong combo.",
      },
    ];
    const score = scoreCommanderDeck({ deck, legality, consistency, comboEvaluations });

    const explanation = generateDeckScoreExplanation({
      score,
      legality,
      structure,
      consistency,
      comboEvaluations,
    });

    expect(explanation.strengths.some((strength) => strength.includes("Combo rilevante"))).toBe(true);
    expect(explanation.summary).toContain("Combo rilevante");
  });

  it("mentions oversized libraries in the summary", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }), 199),
      ],
    });
    const legality = legalReport();
    const structure = analyzeDeckStructure(deck);
    const consistency = analyzeConsistency(deck);
    const score = scoreCommanderDeck({ deck, legality, consistency });

    const explanation = generateDeckScoreExplanation({ score, legality, structure, consistency });

    expect(explanation.summary).toContain("La libreria da 199 carte riduce la consistenza.");
    expect(explanation.weaknesses.some((weakness) => weakness.includes("dimensione del mazzo"))).toBe(true);
  });
});

function legalReport(): CommanderLegalityReport {
  return {
    isLegal: true,
    legalityCap: 100,
    issues: [],
  };
}

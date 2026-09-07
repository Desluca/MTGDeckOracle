import { describe, expect, it } from "vitest";

import { renderHtmlReport, renderMarkdownReport, renderReport, type DeckReport } from "../../src/report/index.js";

describe("reportRenderer", () => {
  it("renders markdown reports", () => {
    const markdown = renderMarkdownReport(createReport());

    expect(markdown).toContain("# MTG Deck Oracle Report");
    expect(markdown).toContain("- Score: 72/100");
    expect(markdown).toContain("## Score Breakdown");
    expect(markdown).toContain("## Detailed Recommendations");
  });

  it("renders html reports", () => {
    const html = renderHtmlReport(createReport());

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("72/100");
    expect(html).toContain("<h2>Score Breakdown</h2>");
    expect(html).toContain("<h2>Detailed Recommendations</h2>");
  });

  it("escapes html content", () => {
    const html = renderHtmlReport({
      ...createReport(),
      explanation: {
        summary: "<script>alert('x')</script>",
        strengths: [],
        weaknesses: [],
        recommendations: [],
      },
    });

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("renders json reports through generic renderer", () => {
    const json = renderReport(createReport(), "json");

    expect(JSON.parse(json)).toMatchObject({
      score: {
        finalScore: 72,
      },
    });
  });
});

function createReport(): DeckReport {
  return {
    legality: {
      isLegal: true,
      legalityCap: 100,
      issues: [],
    },
    structure: {
      composition: {
        totalCards: 100,
        commanderCount: 1,
        mainboardCount: 99,
        landCount: 37,
        nonlandCount: 63,
        averageManaValue: 2.8,
        colorIdentity: ["W", "U"],
      },
      manaCurve: [],
      roleCounts: [],
    },
    consistency: {
      deckSize: 100,
      sizeMultiplier: 1,
      signals: [],
      score: 70,
    },
    detectedCombos: [],
    comboEvaluations: [],
    score: {
      finalScore: 72,
      commanderBracket: 3,
      legalityCap: 100,
      components: [
        {
          category: "consistency",
          label: "Consistenza",
          rawScore: 70,
          weightedScore: 14,
          weight: 20,
          explanation: "Good consistency.",
        },
      ],
      penalties: [],
      explanation: "Deck score explanation.",
    },
    explanation: {
      summary: "Il mazzo ottiene 72/100.",
      strengths: ["Buona consistenza."],
      weaknesses: ["Interaction migliorabile."],
      recommendations: ["Aggiungere removal."],
    },
    detailedRecommendations: [
      {
        priority: "high",
        category: "ramp",
        message: "Aumentare ramp.",
        reason: "Poche fonti di accelerazione.",
        suggestedAdds: ["Arcane Signet"],
        suggestedCuts: ["Seven Mana Spell"],
      },
    ],
  };
}

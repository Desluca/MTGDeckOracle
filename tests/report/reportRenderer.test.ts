import { describe, expect, it } from "vitest";

import { renderHtmlReport, renderMarkdownReport, renderReport, type DeckReport } from "../../src/report/index.js";

describe("reportRenderer", () => {
  it("renders markdown reports", () => {
    const markdown = renderMarkdownReport(createReport());

    expect(markdown).toContain("# MTG Deck Oracle Report");
    expect(markdown).toContain("- Score: 72/100");
    expect(markdown).toContain("Commander bracket: 2 (Core)");
    expect(markdown).toContain("## Score Breakdown");
    expect(markdown).toContain("## Consistency");
    expect(markdown).toContain("## Detailed Recommendations");
  });

  it("renders html reports", () => {
    const html = renderHtmlReport(createReport());

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("72/100");
    expect(html).toContain("<h2>Breakdown</h2>");
    expect(html).toContain("<h2>Consistenza</h2>");
    expect(html).toContain("<h2>Consigli dettagliati</h2>");
    expect(html).toContain("<h2>Punti forti</h2>");
    expect(html).toContain("<h2>Curva di mana</h2>");
    expect(html).toContain('class="curve"');
    expect(html).not.toContain('href="/analyze"');
  });

  it("adds site navigation when requested", () => {
    const html = renderHtmlReport(createReport(), { includeSiteNav: true });

    expect(html).toContain('href="/analyze"');
    expect(html).toContain('href="/rating-lab"');
  });

  it("shows blocking legality errors", () => {
    const html = renderHtmlReport({
      ...createReport(),
      legality: {
        isLegal: false,
        legalityCap: 40,
        issues: [
          {
            code: "invalid_deck_size",
            severity: "blocking",
            message: "Il mazzo ha troppe carte.",
          },
        ],
      },
    });

    expect(html).toContain("Errori di legalita'");
    expect(html).toContain("invalid_deck_size");
    expect(html).toContain("class=\"illegal\"");
  });

  it("escapes html content", () => {
    const html = renderHtmlReport({
      ...createReport(),
      explanation: {
        summary: "<script>alert('x')</script>",
        scoreNotes: "Note",
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
      manaCurve: [
        { manaValue: 1, count: 8 },
        { manaValue: 2, count: 14 },
        { manaValue: 3, count: 11 },
      ],
      roleCounts: [],
    },
    consistency: {
      deckSize: 100,
      librarySize: 99,
      sizeMultiplier: 1,
      redundancyScore: 0.7,
      signals: [],
      score: 70,
    },
    detectedCombos: [],
    comboEvaluations: [],
    score: {
      finalScore: 72,
      commanderBracket: 2,
      bracket: {
        bracket: 2,
        label: "Core",
        minimumBracket: 2,
        gameChangerCount: 0,
        gameChangerNames: [],
        signals: [],
        explanation: "Nessun Game Changer.",
      },
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
      scoreNotes: "Il voto 72/100 e' indipendente dal bracket 2.",
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

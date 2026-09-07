import type { DeckStructureSummary } from "../analysis/index.js";
import type { ConsistencyAnalysis } from "../consistency/index.js";
import type {
  ComboEvaluation,
  CommanderLegalityReport,
  DetectedCombo,
  ScoreBreakdown,
} from "../domain/index.js";
import type { DeckScoreExplanation } from "../explanation/index.js";
import type { DeckRecommendation } from "../recommendations/index.js";

export interface DeckReport {
  readonly legality: CommanderLegalityReport;
  readonly structure: DeckStructureSummary;
  readonly consistency: ConsistencyAnalysis;
  readonly detectedCombos: readonly DetectedCombo[];
  readonly comboEvaluations: readonly ComboEvaluation[];
  readonly score: ScoreBreakdown;
  readonly explanation: DeckScoreExplanation;
  readonly detailedRecommendations?: readonly DeckRecommendation[];
}

export type ReportFormat = "json" | "markdown" | "html";

export function renderReport(report: DeckReport, format: ReportFormat): string {
  switch (format) {
    case "json":
      return `${JSON.stringify(report, null, 2)}\n`;
    case "markdown":
      return renderMarkdownReport(report);
    case "html":
      return renderHtmlReport(report);
  }
}

export function renderMarkdownReport(report: DeckReport): string {
  return [
    `# MTG Deck Oracle Report`,
    "",
    `## Summary`,
    "",
    report.explanation.summary,
    "",
    `- Score: ${report.score.finalScore}/100`,
    `- Commander bracket: ${report.score.commanderBracket}`,
    `- Legality cap: ${report.score.legalityCap}/100`,
    `- Deck size: ${report.structure.composition.totalCards}`,
    `- Lands: ${report.structure.composition.landCount}`,
    `- Average mana value: ${report.structure.composition.averageManaValue}`,
    "",
    renderMarkdownList("Strengths", report.explanation.strengths),
    renderMarkdownList("Weaknesses", report.explanation.weaknesses),
    renderMarkdownList("Recommendations", report.explanation.recommendations),
    renderMarkdownDetailedRecommendations(report.detailedRecommendations ?? []),
    renderMarkdownComponents(report.score),
    renderMarkdownCombos(report),
  ]
    .filter((section) => section.length > 0)
    .join("\n");
}

export function renderHtmlReport(report: DeckReport): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    "  <title>MTG Deck Oracle Report</title>",
    "  <style>body{font-family:system-ui,sans-serif;max-width:960px;margin:40px auto;line-height:1.5}code{background:#f4f4f4;padding:2px 4px;border-radius:4px}.score{font-size:2rem;font-weight:700}</style>",
    "</head>",
    "<body>",
    "  <h1>MTG Deck Oracle Report</h1>",
    `  <p class="score">${report.score.finalScore}/100</p>`,
    `  <p>${escapeHtml(report.explanation.summary)}</p>`,
    "  <h2>Overview</h2>",
    "  <ul>",
    `    <li>Commander bracket: ${report.score.commanderBracket}</li>`,
    `    <li>Legality cap: ${report.score.legalityCap}/100</li>`,
    `    <li>Deck size: ${report.structure.composition.totalCards}</li>`,
    `    <li>Lands: ${report.structure.composition.landCount}</li>`,
    `    <li>Average mana value: ${report.structure.composition.averageManaValue}</li>`,
    "  </ul>",
    renderHtmlList("Strengths", report.explanation.strengths),
    renderHtmlList("Weaknesses", report.explanation.weaknesses),
    renderHtmlList("Recommendations", report.explanation.recommendations),
    renderHtmlDetailedRecommendations(report.detailedRecommendations ?? []),
    renderHtmlComponents(report.score),
    renderHtmlCombos(report),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function renderMarkdownList(title: string, items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }

  return [`## ${title}`, "", ...items.map((item) => `- ${item}`), ""].join("\n");
}

function renderMarkdownComponents(score: ScoreBreakdown): string {
  return [
    "## Score Breakdown",
    "",
    ...score.components.map((component) => `- ${component.label}: ${component.rawScore}/100 (${component.weightedScore} weighted)`),
    "",
  ].join("\n");
}

function renderMarkdownCombos(report: DeckReport): string {
  if (report.comboEvaluations.length === 0) {
    return "";
  }

  return [
    "## Combos",
    "",
    ...report.comboEvaluations.map((combo) => `- ${combo.detectedComboId}: impact ${combo.impactScore}/100, speed ${combo.speed}, commander role ${combo.commanderRole}`),
    "",
  ].join("\n");
}

function renderMarkdownDetailedRecommendations(recommendations: readonly DeckRecommendation[]): string {
  if (recommendations.length === 0) {
    return "";
  }

  return [
    "## Detailed Recommendations",
    "",
    ...recommendations.flatMap((recommendation) => [
      `### ${recommendation.category} (${recommendation.priority})`,
      "",
      recommendation.message,
      "",
      `Reason: ${recommendation.reason}`,
      "",
      `Suggested adds: ${recommendation.suggestedAdds.join(", ") || "none"}`,
      `Suggested cuts: ${recommendation.suggestedCuts.join(", ") || "none"}`,
      "",
    ]),
  ].join("\n");
}

function renderHtmlList(title: string, items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }

  return [`  <h2>${escapeHtml(title)}</h2>`, "  <ul>", ...items.map((item) => `    <li>${escapeHtml(item)}</li>`), "  </ul>"].join("\n");
}

function renderHtmlComponents(score: ScoreBreakdown): string {
  return [
    "  <h2>Score Breakdown</h2>",
    "  <ul>",
    ...score.components.map((component) => `    <li>${escapeHtml(component.label)}: ${component.rawScore}/100 (${component.weightedScore} weighted)</li>`),
    "  </ul>",
  ].join("\n");
}

function renderHtmlCombos(report: DeckReport): string {
  if (report.comboEvaluations.length === 0) {
    return "";
  }

  return [
    "  <h2>Combos</h2>",
    "  <ul>",
    ...report.comboEvaluations.map((combo) => `    <li>${escapeHtml(combo.detectedComboId)}: impact ${combo.impactScore}/100, speed ${combo.speed}, commander role ${combo.commanderRole}</li>`),
    "  </ul>",
  ].join("\n");
}

function renderHtmlDetailedRecommendations(recommendations: readonly DeckRecommendation[]): string {
  if (recommendations.length === 0) {
    return "";
  }

  return [
    "  <h2>Detailed Recommendations</h2>",
    ...recommendations.map((recommendation) =>
      [
        `  <section>`,
        `    <h3>${escapeHtml(recommendation.category)} (${recommendation.priority})</h3>`,
        `    <p>${escapeHtml(recommendation.message)}</p>`,
        `    <p><strong>Reason:</strong> ${escapeHtml(recommendation.reason)}</p>`,
        `    <p><strong>Suggested adds:</strong> ${escapeHtml(recommendation.suggestedAdds.join(", ") || "none")}</p>`,
        `    <p><strong>Suggested cuts:</strong> ${escapeHtml(recommendation.suggestedCuts.join(", ") || "none")}</p>`,
        `  </section>`,
      ].join("\n"),
    ),
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

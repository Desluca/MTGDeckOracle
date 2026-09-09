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

export interface HtmlReportOptions {
  readonly includeSiteNav?: boolean;
}

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
    report.explanation.scoreNotes,
    "",
    `- Score: ${report.score.finalScore}/100`,
    `- Commander bracket: ${report.score.commanderBracket} (${report.score.bracket.label})`,
    `- Game Changers: ${report.score.bracket.gameChangerCount}`,
    `- Legality cap: ${report.score.legalityCap}/100`,
    `- Deck size: ${report.structure.composition.totalCards}`,
    `- Lands: ${report.structure.composition.landCount}`,
    `- Average mana value: ${report.structure.composition.averageManaValue}`,
    "",
    renderMarkdownList("Strengths", report.explanation.strengths),
    renderMarkdownList("Weaknesses", report.explanation.weaknesses),
    renderMarkdownList("Recommendations", report.explanation.recommendations),
    renderMarkdownConsistency(report.consistency),
    renderMarkdownDetailedRecommendations(report.detailedRecommendations ?? []),
    renderMarkdownComponents(report.score),
    renderMarkdownCombos(report),
  ]
    .filter((section) => section.length > 0)
    .join("\n");
}

export function renderHtmlReport(report: DeckReport, options: HtmlReportOptions = {}): string {
  const nav = options.includeSiteNav
    ? '  <p class="nav"><a href="/">Home</a> · <a href="/analyze">Nuova analisi</a> · <a href="/rating-lab">Rating Lab</a></p>'
    : "";

  return [
    "<!doctype html>",
    '<html lang="it">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    "  <title>Report mazzo — MTG Deck Oracle</title>",
    "  <style>",
    "    body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc}",
    "    main{max-width:960px;margin:0 auto;padding:32px;line-height:1.5}",
    "    a{color:#93c5fd}",
    "    .score{font-size:2.4rem;font-weight:800;margin:8px 0}",
    "    .illegal{background:#7f1d1d;color:#fecaca;padding:12px 14px;border-radius:12px}",
    "    .curve{display:flex;align-items:flex-end;gap:8px;height:160px;padding-top:12px}",
    "    .bar-wrap{min-width:28px;text-align:center;color:#cbd5e1;font-size:0.8rem}",
    "    .bar{width:100%;min-height:2px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#22c55e,#16a34a)}",
    "    section{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:16px 18px;margin:16px 0}",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    nav,
    "  <h1>Report mazzo</h1>",
    `  <p class="score">${report.score.finalScore}/100</p>`,
    `  <p>${escapeHtml(report.explanation.summary)}</p>`,
    `  <p>${escapeHtml(report.explanation.scoreNotes)}</p>`,
    renderHtmlLegality(report.legality),
    "  <section>",
    "  <h2>Panoramica</h2>",
    "  <ul>",
    `    <li>Bracket: ${report.score.commanderBracket} (${escapeHtml(report.score.bracket.label)})</li>`,
    `    <li>Game Changers: ${report.score.bracket.gameChangerCount}</li>`,
    `    <li>Cap legalita': ${report.score.legalityCap}/100</li>`,
    `    <li>Carte: ${report.structure.composition.totalCards}</li>`,
    `    <li>Terre: ${report.structure.composition.landCount}</li>`,
    `    <li>Mana value medio: ${report.structure.composition.averageManaValue}</li>`,
    "  </ul>",
    "  </section>",
    renderHtmlManaCurve(report.structure.manaCurve),
    renderHtmlList("Punti forti", report.explanation.strengths),
    renderHtmlList("Punti deboli", report.explanation.weaknesses),
    renderHtmlList("Consigli", report.explanation.recommendations),
    renderHtmlConsistency(report.consistency),
    renderHtmlDetailedRecommendations(report.detailedRecommendations ?? []),
    renderHtmlComponents(report.score),
    renderHtmlCombos(report),
    "  </main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function renderHtmlLegality(legality: CommanderLegalityReport): string {
  if (legality.isLegal && legality.issues.length === 0) {
    return "";
  }

  const heading = legality.isLegal ? "Avvisi di costruzione" : "Errori di legalita'";
  const items = legality.issues.map((issue) => {
    const card = issue.cardName ? ` (${issue.cardName})` : "";
    return `    <li>${escapeHtml(issue.code)}${escapeHtml(card)}: ${escapeHtml(issue.message)}</li>`;
  });

  return [
    `  <section class="${legality.isLegal ? "warnings" : "illegal"}">`,
    `  <h2>${heading}</h2>`,
    "  <ul>",
    ...(items.length > 0 ? items : ["    <li>La lista non e' legale rispetto ai controlli disponibili.</li>"]),
    "  </ul>",
    "  </section>",
  ].join("\n");
}

function renderHtmlManaCurve(manaCurve: DeckStructureSummary["manaCurve"]): string {
  if (manaCurve.length === 0) {
    return "";
  }

  const maxCount = Math.max(...manaCurve.map((bucket) => bucket.count), 1);

  return [
    "  <section>",
    "  <h2>Curva di mana</h2>",
    '  <div class="curve">',
    ...manaCurve.map((bucket) => {
      const height = Math.max(2, Math.round((bucket.count / maxCount) * 140));
      return `    <div class="bar-wrap" title="MV ${bucket.manaValue}: ${bucket.count}"><div class="bar" style="height:${height}px"></div>${bucket.manaValue}<br>${bucket.count}</div>`;
    }),
    "  </div>",
    "  </section>",
  ].join("\n");
}

function renderMarkdownList(title: string, items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }

  return [`## ${title}`, "", ...items.map((item) => `- ${item}`), ""].join("\n");
}

function renderMarkdownConsistency(consistency: ConsistencyAnalysis): string {
  return [
    "## Consistency",
    "",
    `- Score: ${consistency.score}/100`,
    `- Library size: ${consistency.librarySize}`,
    `- Redundancy: ${consistency.redundancyScore.toFixed(2)}`,
    `- Size multiplier: ${consistency.sizeMultiplier.toFixed(2)}`,
    ...consistency.signals.map((signal) => `- ${signal.name}: ${Math.round(signal.probability * 100)}% — ${signal.explanation}`),
    "",
  ].join("\n");
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

  return ["  <section>", `  <h2>${escapeHtml(title)}</h2>`, "  <ul>", ...items.map((item) => `    <li>${escapeHtml(item)}</li>`), "  </ul>", "  </section>"].join("\n");
}

function renderHtmlConsistency(consistency: ConsistencyAnalysis): string {
  return [
    "  <section>",
    "  <h2>Consistenza</h2>",
    "  <ul>",
    `    <li>Punteggio: ${consistency.score}/100</li>`,
    `    <li>Dimensione libreria: ${consistency.librarySize}</li>`,
    `    <li>Ridondanza: ${consistency.redundancyScore.toFixed(2)}</li>`,
    `    <li>Moltiplicatore dimensione: ${consistency.sizeMultiplier.toFixed(2)}</li>`,
    ...consistency.signals.map(
      (signal) => `    <li>${escapeHtml(signal.name)}: ${Math.round(signal.probability * 100)}% — ${escapeHtml(signal.explanation)}</li>`,
    ),
    "  </ul>",
    "  </section>",
  ].join("\n");
}

function renderHtmlComponents(score: ScoreBreakdown): string {
  return [
    "  <section>",
    "  <h2>Breakdown</h2>",
    "  <ul>",
    ...score.components.map((component) => `    <li>${escapeHtml(component.label)}: ${component.rawScore}/100 (${component.weightedScore} pesato)</li>`),
    "  </ul>",
    "  </section>",
  ].join("\n");
}

function renderHtmlCombos(report: DeckReport): string {
  if (report.comboEvaluations.length === 0) {
    return "";
  }

  return [
    "  <section>",
    "  <h2>Combo</h2>",
    "  <ul>",
    ...report.comboEvaluations.map((combo) => `    <li>${escapeHtml(combo.detectedComboId)}: impatto ${combo.impactScore}/100, velocita' ${combo.speed}, ruolo comandante ${combo.commanderRole}</li>`),
    "  </ul>",
    "  </section>",
  ].join("\n");
}

function renderHtmlDetailedRecommendations(recommendations: readonly DeckRecommendation[]): string {
  if (recommendations.length === 0) {
    return "";
  }

  return [
    "  <section>",
    "  <h2>Consigli dettagliati</h2>",
    ...recommendations.map((recommendation) =>
      [
        `    <h3>${escapeHtml(recommendation.category)} (${escapeHtml(recommendation.priority)})</h3>`,
        `    <p>${escapeHtml(recommendation.message)}</p>`,
        `    <p><strong>Motivo:</strong> ${escapeHtml(recommendation.reason)}</p>`,
        `    <p><strong>Aggiunte:</strong> ${escapeHtml(recommendation.suggestedAdds.join(", ") || "nessuna")}</p>`,
        `    <p><strong>Tagli:</strong> ${escapeHtml(recommendation.suggestedCuts.join(", ") || "nessuno")}</p>`,
      ].join("\n"),
    ),
    "  </section>",
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

import type { CommanderLegalityReport } from "../domain/index.js";
import { analyzeCommanderDeck, type AnalyzeCommanderDeckInput } from "../pipeline/analyzeCommanderDeck.js";
import { renderHtmlReport } from "../report/index.js";

export const ANALYZE_PATH = "/analyze";
export const MAX_DECKLIST_CHARS = 100_000;
export const MAX_ANALYZE_BODY_BYTES = 250_000;

export function extractDecklistFromRequestBody(contentType: string | undefined, body: string): string {
  const mediaType = (contentType ?? "application/x-www-form-urlencoded").split(";")[0]?.trim().toLowerCase();

  if (mediaType === "application/json") {
    const parsed = JSON.parse(body) as { decklist?: unknown };
    return typeof parsed.decklist === "string" ? parsed.decklist : "";
  }

  return new URLSearchParams(body).get("decklist") ?? "";
}

export interface AnalyzeDeckWebDependencies {
  readonly cardDataSource: AnalyzeCommanderDeckInput["cardDataSource"];
  readonly comboDataProvider: AnalyzeCommanderDeckInput["comboDataProvider"];
  readonly tagProvider?: AnalyzeCommanderDeckInput["tagProvider"];
  readonly ratingProvider?: AnalyzeCommanderDeckInput["ratingProvider"];
}

export interface AnalyzeDeckWebResult {
  readonly statusCode: number;
  readonly html: string;
}

export function renderAnalyzeFormPage(errorMessage?: string, decklist = ""): string {
  const errorBlock = errorMessage ? `    <p class="error">${escapeHtml(errorMessage)}</p>\n` : "";

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Analizza mazzo — MTG Deck Oracle</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    main { max-width: 960px; margin: 0 auto; padding: 32px; }
    a { color: #93c5fd; }
    textarea { width: 100%; min-height: 360px; box-sizing: border-box; border-radius: 12px; border: 1px solid #334155; background: #111827; color: #f8fafc; padding: 14px; font: 14px/1.5 ui-monospace, monospace; }
    button { margin-top: 16px; border: 0; border-radius: 12px; padding: 12px 18px; background: #22c55e; color: #052e16; font-weight: 800; cursor: pointer; }
    .error { background: #7f1d1d; color: #fecaca; padding: 12px 14px; border-radius: 12px; }
    .hint { color: #cbd5e1; line-height: 1.6; }
  </style>
</head>
<body>
  <main>
    <p><a href="/">Home</a> · <a href="/rating-lab">Rating Lab</a></p>
    <h1>Analizza un mazzo Commander</h1>
    <p class="hint">Incolla una lista testuale (comandante + 99). Non si importano URL Moxfield o Archidekt.</p>
${errorBlock}    <form method="post" action="${ANALYZE_PATH}">
      <label for="decklist">Decklist</label>
      <textarea id="decklist" name="decklist" required placeholder="Commander&#10;1 Kinnan, Bonder Prodigy&#10;&#10;Deck&#10;1 Sol Ring">${escapeHtml(decklist)}</textarea>
      <button type="submit">Analizza</button>
    </form>
  </main>
</body>
</html>`;
}

export async function analyzeDeckToHtml(rawText: string, dependencies: AnalyzeDeckWebDependencies): Promise<AnalyzeDeckWebResult> {
  const decklist = rawText.trim();

  if (!decklist) {
    return { statusCode: 400, html: renderAnalyzeFormPage("Incolla una decklist testuale prima di analizzare.") };
  }

  if (decklist.length > MAX_DECKLIST_CHARS) {
    return { statusCode: 413, html: renderAnalyzeFormPage("La lista e' troppo lunga.", decklist.slice(0, MAX_DECKLIST_CHARS)) };
  }

  const result = await analyzeCommanderDeck({
    rawText: decklist,
    sourceUrl: ANALYZE_PATH,
    cardDataSource: dependencies.cardDataSource,
    comboDataProvider: dependencies.comboDataProvider,
    ...(dependencies.tagProvider ? { tagProvider: dependencies.tagProvider } : {}),
    ...(dependencies.ratingProvider ? { ratingProvider: dependencies.ratingProvider } : {}),
  });

  if (!result.ok) {
    return {
      statusCode: 422,
      html: renderUnresolvedPage(result.unresolvedNames, result.legality, decklist),
    };
  }

  return { statusCode: 200, html: renderHtmlReport(result.report, { includeSiteNav: true }) };
}

function renderUnresolvedPage(
  unresolvedNames: readonly string[],
  legality: CommanderLegalityReport,
  decklist: string,
): string {
  const unknown = unresolvedNames.length > 0 ? `Carte non riconosciute: ${unresolvedNames.join(", ")}.` : "Alcune carte non sono state risolte.";
  const legalityNotes = legality.issues.map((issue) => issue.message).filter(Boolean);
  const message = [unknown, ...legalityNotes].join(" ");
  return renderAnalyzeFormPage(message, decklist);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

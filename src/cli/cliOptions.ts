import type { ReportFormat } from "../report/index.js";

export type CardRatingsMode = "auto" | "off";

export interface AnalyzeDeckCliOptions {
  readonly deckFilePath?: string;
  readonly format: ReportFormat;
  readonly cardRatings: CardRatingsMode;
  readonly offline: boolean;
  readonly scoreNotes?: string;
}

export function parseAnalyzeDeckCliOptions(argv: readonly string[]): AnalyzeDeckCliOptions {
  let format: ReportFormat = "json";
  let cardRatings: CardRatingsMode = "auto";
  let deckFilePath: string | undefined;
  let offline = false;
  let scoreNotes: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--format") {
      format = parseReportFormat(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--format=")) {
      format = parseReportFormat(arg.slice("--format=".length));
      continue;
    }

    if (arg === "--card-ratings") {
      cardRatings = parseCardRatingsMode(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--card-ratings=")) {
      cardRatings = parseCardRatingsMode(arg.slice("--card-ratings=".length));
      continue;
    }

    if (arg === "--no-card-ratings") {
      cardRatings = "off";
      continue;
    }

    if (arg === "--offline") {
      offline = true;
      continue;
    }

    if (arg === "--notes" || arg === "--score-notes") {
      scoreNotes = parseScoreNotes(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--notes=")) {
      scoreNotes = parseScoreNotes(arg.slice("--notes=".length));
      continue;
    }

    if (arg?.startsWith("--score-notes=")) {
      scoreNotes = parseScoreNotes(arg.slice("--score-notes=".length));
      continue;
    }

    if (!arg?.startsWith("-") && !deckFilePath) {
      deckFilePath = arg;
    }
  }

  const options: AnalyzeDeckCliOptions = deckFilePath
    ? { deckFilePath, format, cardRatings, offline }
    : { format, cardRatings, offline };

  return scoreNotes ? { ...options, scoreNotes } : options;
}

function parseScoreNotes(value: string | undefined): string {
  if (!value || value.startsWith("-")) {
    throw new Error("Missing score notes. Use --notes \"text\".");
  }

  return value;
}

function parseReportFormat(value: string | undefined): ReportFormat {
  if (value === "json" || value === "markdown" || value === "html") {
    return value;
  }

  throw new Error("Invalid format. Use json, markdown or html.");
}

function parseCardRatingsMode(value: string | undefined): CardRatingsMode {
  if (value === "auto" || value === "off") {
    return value;
  }

  throw new Error("Invalid card ratings mode. Use auto or off.");
}

import type { ReportFormat } from "../report/index.js";

export interface AnalyzeDeckCliOptions {
  readonly deckFilePath?: string;
  readonly format: ReportFormat;
}

export function parseAnalyzeDeckCliOptions(argv: readonly string[]): AnalyzeDeckCliOptions {
  let format: ReportFormat = "json";
  let deckFilePath: string | undefined;

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

    if (!arg?.startsWith("-") && !deckFilePath) {
      deckFilePath = arg;
    }
  }

  return deckFilePath ? { deckFilePath, format } : { format };
}

function parseReportFormat(value: string | undefined): ReportFormat {
  if (value === "json" || value === "markdown" || value === "html") {
    return value;
  }

  throw new Error("Invalid format. Use json, markdown or html.");
}

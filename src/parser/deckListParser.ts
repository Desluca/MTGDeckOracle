import { normalizeLookupName } from "../card-data/cardDataSource.js";
import type { DeckSection, DeckSourceType, ParsedDeckLine, RawDeckInput } from "../domain/index.js";

export type ParseIssueCode =
  | "invalid_quantity"
  | "empty_card_name"
  | "unknown_section"
  | "unrecognized_line";

export type ParseIssueSeverity = "warning" | "error";

export interface ParseIssue {
  readonly code: ParseIssueCode;
  readonly severity: ParseIssueSeverity;
  readonly lineNumber: number;
  readonly message: string;
  readonly rawLine: string;
}

export interface ParsedDeck {
  readonly input: RawDeckInput;
  readonly lines: readonly ParsedDeckLine[];
  readonly issues: readonly ParseIssue[];
  readonly sectionCounts: Readonly<Record<DeckSection, number>>;
  readonly totalQuantity: number;
}

export interface ParseDeckListOptions {
  readonly sourceType?: DeckSourceType;
  readonly sourceUrl?: string;
  readonly defaultSection?: DeckSection;
}

const SECTION_ALIASES: Readonly<Record<string, DeckSection>> = {
  commander: "commander",
  commanders: "commander",
  "command zone": "commander",
  cmdr: "commander",

  deck: "mainboard",
  main: "mainboard",
  mainboard: "mainboard",
  cards: "mainboard",
  creatures: "mainboard",
  creature: "mainboard",
  artifacts: "mainboard",
  artifact: "mainboard",
  enchantments: "mainboard",
  enchantment: "mainboard",
  instants: "mainboard",
  instant: "mainboard",
  sorceries: "mainboard",
  sorcery: "mainboard",
  lands: "mainboard",
  land: "mainboard",
  planeswalkers: "mainboard",
  planeswalker: "mainboard",

  sideboard: "sideboard",
  side: "sideboard",
  considering: "maybeboard",
  maybeboard: "maybeboard",
  maybe: "maybeboard",
};

const INITIAL_SECTION_COUNTS: Readonly<Record<DeckSection, number>> = {
  commander: 0,
  mainboard: 0,
  sideboard: 0,
  maybeboard: 0,
  unknown: 0,
};

export function parseDeckList(rawText: string, options: ParseDeckListOptions = {}): ParsedDeck {
  const input = createRawDeckInput(rawText, options);
  const lines: ParsedDeckLine[] = [];
  const issues: ParseIssue[] = [];
  const sectionCounts: Record<DeckSection, number> = { ...INITIAL_SECTION_COUNTS };
  let currentSection = options.defaultSection ?? "mainboard";

  rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const cleanedLine = cleanLine(rawLine);

      if (cleanedLine.length === 0) {
        return;
      }

      const section = parseSectionHeader(cleanedLine);
      if (section.kind === "known") {
        currentSection = section.section;
        return;
      }

      if (section.kind === "unknown") {
        currentSection = "unknown";
        issues.push({
          code: "unknown_section",
          severity: "warning",
          lineNumber,
          message: `Sezione non riconosciuta: ${section.label}.`,
          rawLine,
        });
        return;
      }

      if (isCommentLine(cleanedLine)) {
        return;
      }

      const parsedLine = parseCardLine(cleanedLine, lineNumber, currentSection);
      if (parsedLine.issue) {
        issues.push({ ...parsedLine.issue, rawLine });
        return;
      }

      if (!parsedLine.line) {
        issues.push({
          code: "unrecognized_line",
          severity: "error",
          lineNumber,
          message: "Riga non riconosciuta come carta o sezione.",
          rawLine,
        });
        return;
      }

      lines.push(parsedLine.line);
      sectionCounts[parsedLine.line.section] += parsedLine.line.quantity;
    });

  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);

  return {
    input,
    lines,
    issues,
    sectionCounts,
    totalQuantity,
  };
}

function createRawDeckInput(rawText: string, options: ParseDeckListOptions): RawDeckInput {
  const sourceType = options.sourceType ?? "plain_text";

  if (options.sourceUrl) {
    return {
      sourceType,
      rawText,
      sourceUrl: options.sourceUrl,
    };
  }

  return {
    sourceType,
    rawText,
  };
}

function cleanLine(rawLine: string): string {
  return rawLine.trim().replace(/\s+#.*$/, "").trim();
}

function isCommentLine(line: string): boolean {
  return line.startsWith("#") || line.startsWith("//");
}

type SectionParseResult =
  | { readonly kind: "known"; readonly section: DeckSection }
  | { readonly kind: "unknown"; readonly label: string }
  | { readonly kind: "none" };

function parseSectionHeader(line: string): SectionParseResult {
  const commentMatch = line.match(/^\/\/\s*(?<label>[A-Za-z][A-Za-z\s_-]*)$/);
  if (commentMatch?.groups?.label) {
    const section = parseSectionLabel(commentMatch.groups.label);
    return section.kind === "known" ? section : { kind: "none" };
  }

  const bracketMatch = line.match(/^\[(?<label>[^\]]+)\]$/);
  if (bracketMatch?.groups?.label) {
    return parseSectionLabel(bracketMatch.groups.label);
  }

  const colonMatch = line.match(/^(?<label>[A-Za-z][A-Za-z\s_-]*):$/);
  if (colonMatch?.groups?.label) {
    return parseSectionLabel(colonMatch.groups.label);
  }

  const directLabel = normalizeSectionLabel(line);
  const directSection = SECTION_ALIASES[directLabel];
  if (directSection) {
    return {
      kind: "known",
      section: directSection,
    };
  }

  return { kind: "none" };
}

function parseSectionLabel(label: string): SectionParseResult {
  const normalizedLabel = normalizeSectionLabel(label);
  const section = SECTION_ALIASES[normalizedLabel];

  if (section) {
    return {
      kind: "known",
      section,
    };
  }

  return {
    kind: "unknown",
    label,
  };
}

function normalizeSectionLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

interface ParsedCardLineResult {
  readonly line?: ParsedDeckLine;
  readonly issue?: Omit<ParseIssue, "rawLine">;
}

function parseCardLine(line: string, lineNumber: number, section: DeckSection): ParsedCardLineResult {
  const quantityMatch = line.match(/^(?<quantity>\d+)\s*x?\s+(?<name>.+)$/i);
  const compactQuantityMatch = line.match(/^(?<quantity>\d+)x\s+(?<name>.+)$/i);
  const match = quantityMatch ?? compactQuantityMatch;

  if (match?.groups) {
    const quantity = Number.parseInt(match.groups.quantity ?? "", 10);
    const name = cleanCardName(match.groups.name ?? "");

    if (!Number.isInteger(quantity) || quantity < 1) {
      return {
        issue: {
          code: "invalid_quantity",
          severity: "error",
          lineNumber,
          message: "La quantita' deve essere un numero intero maggiore di zero.",
        },
      };
    }

    if (name.length === 0) {
      return {
        issue: {
          code: "empty_card_name",
          severity: "error",
          lineNumber,
          message: "Nome carta mancante.",
        },
      };
    }

    return {
      line: {
        lineNumber,
        quantity,
        rawName: name,
        normalizedName: normalizeCardName(name),
        section,
      },
    };
  }

  const name = cleanCardName(line);
  if (name.length === 0) {
    return {
      issue: {
        code: "empty_card_name",
        severity: "error",
        lineNumber,
        message: "Nome carta mancante.",
      },
    };
  }

  return {
    line: {
      lineNumber,
      quantity: 1,
      rawName: name,
      normalizedName: normalizeCardName(name),
      section,
    },
  };
}

export function cleanCardName(rawName: string): string {
  let cleanedName = rawName.trim();
  let previousName: string;

  do {
    previousName = cleanedName;
    cleanedName = cleanedName
      .replace(/^\[[A-Z0-9]{2,8}(?::[A-Z0-9-]+)?\]\s+/i, "")
      .replace(/^\([A-Z0-9]{2,8}\)\s*#?[A-Z0-9-]+\s+/i, "")
      .replace(/\s+\*[A-Z]+\*$/i, "")
      .replace(/\s+\[[A-Z0-9]{2,8}(?::[A-Z0-9-]+)?\]$/i, "")
      .replace(/\s+\([A-Z0-9]{2,8}\)\s*#?[A-Z0-9-]+[a-z]?$/i, "")
      .replace(/\s+\([A-Z0-9]{2,8}\)$/i, "")
      .replace(/\s+\[[A-Z0-9]{2,8}\]\s*#?[A-Z0-9-]+[a-z]?$/i, "")
      .replace(/\s+\{[A-Z0-9]{2,8}\}\s*#?[A-Z0-9-]+[a-z]?$/i, "")
      .trim()
      .replace(/\s+/g, " ");
  } while (cleanedName !== previousName);

  return cleanedName;
}

export function normalizeCardName(cardName: string): string {
  return normalizeLookupName(cleanCardName(cardName));
}

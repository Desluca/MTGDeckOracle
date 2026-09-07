import type { ParsedDeck } from "../parser/index.js";
import type { Card, Color, CommanderLegalityReport, LegalityIssue, LegalityIssueCode } from "../domain/index.js";

export interface CommanderValidationOptions {
  readonly expectedDeckSize?: number;
  readonly deckSizeRule?: DeckSizeRule;
  readonly minCommanderCount?: number;
  readonly maxCommanderCount?: number;
  readonly allowSideboard?: boolean;
  readonly allowedMultipleCopies?: ReadonlySet<string>;
  readonly cardsByNormalizedName?: ReadonlyMap<string, Card>;
}

export interface DeckSizeRule {
  readonly exactCards?: number;
  readonly minCards?: number;
  readonly maxCards?: number;
  readonly source?: "format" | "commander_rulebreaker" | "card_rule" | "test";
  readonly description?: string;
}

const DEFAULT_EXPECTED_DECK_SIZE = 100;
const DEFAULT_MIN_COMMANDER_COUNT = 1;
const DEFAULT_MAX_COMMANDER_COUNT = 2;

const BASIC_LANDS = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
]);

const DEFAULT_ALLOWED_MULTIPLE_COPIES = new Set([
  ...BASIC_LANDS,
  "persistent petitioners",
  "rat colony",
  "relentless rats",
  "seven dwarves",
  "shadowborn apostle",
  "templar knight",
]);

export function validateCommanderDeck(
  parsedDeck: ParsedDeck,
  options: CommanderValidationOptions = {},
): CommanderLegalityReport {
  const deckSizeRule = resolveDeckSizeRule(parsedDeck, options);
  const minCommanderCount = options.minCommanderCount ?? DEFAULT_MIN_COMMANDER_COUNT;
  const maxCommanderCount = options.maxCommanderCount ?? DEFAULT_MAX_COMMANDER_COUNT;
  const allowSideboard = options.allowSideboard ?? false;
  const allowedMultipleCopies = options.allowedMultipleCopies ?? DEFAULT_ALLOWED_MULTIPLE_COPIES;

  const issues: LegalityIssue[] = [];

  addParseIssues(parsedDeck, issues);
  addCommanderIssues(parsedDeck, minCommanderCount, maxCommanderCount, issues);
  addCardDataIssues(parsedDeck, options.cardsByNormalizedName, issues);
  addDeckSizeIssues(parsedDeck, deckSizeRule, issues);
  addDuplicateIssues(parsedDeck, allowedMultipleCopies, issues);
  addSectionIssues(parsedDeck, allowSideboard, issues);

  const legalityCap = calculateLegalityCap(parsedDeck, issues, deckSizeRule);
  const isLegal = legalityCap === 100 && issues.every((issue) => issue.severity !== "error" && issue.severity !== "blocking");

  return {
    isLegal,
    legalityCap,
    issues,
  };
}

function resolveDeckSizeRule(parsedDeck: ParsedDeck, options: CommanderValidationOptions): DeckSizeRule {
  if (options.deckSizeRule) {
    return options.deckSizeRule;
  }

  const commanderCards = getResolvedCommanderCards(parsedDeck, options.cardsByNormalizedName);
  if (commanderCards.some(hasNoMaximumDeckSizeRule)) {
    return {
      minCards: DEFAULT_EXPECTED_DECK_SIZE,
      source: "commander_rulebreaker",
      description: "A commander rule removes the maximum deck size.",
    };
  }

  return {
    exactCards: options.expectedDeckSize ?? DEFAULT_EXPECTED_DECK_SIZE,
    source: "format",
    description: "Commander deck size standard.",
  };
}

function addParseIssues(parsedDeck: ParsedDeck, issues: LegalityIssue[]): void {
  for (const issue of parsedDeck.issues) {
    issues.push({
      code: "ambiguous_parse",
      severity: issue.severity === "error" ? "error" : "warning",
      message: `Problema di parsing alla riga ${issue.lineNumber}: ${issue.message}`,
      actual: issue.rawLine,
    });
  }
}

function addCardDataIssues(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card> | undefined,
  issues: LegalityIssue[],
): void {
  if (!cardsByNormalizedName) {
    return;
  }

  addUnknownCardIssues(parsedDeck, cardsByNormalizedName, issues);
  addCommanderCardIssues(parsedDeck, cardsByNormalizedName, issues);
  addCardLegalityIssues(parsedDeck, cardsByNormalizedName, issues);
  addColorIdentityIssues(parsedDeck, cardsByNormalizedName, issues);
}

function addUnknownCardIssues(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card>,
  issues: LegalityIssue[],
): void {
  for (const line of parsedDeck.lines) {
    if (!cardsByNormalizedName.has(line.normalizedName)) {
      issues.push({
        code: "unknown_card",
        severity: "blocking",
        message: "Carta non riconosciuta dalla fonte dati.",
        cardName: line.rawName,
      });
    }
  }
}

function addCommanderCardIssues(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card>,
  issues: LegalityIssue[],
): void {
  for (const line of parsedDeck.lines.filter((deckLine) => deckLine.section === "commander")) {
    const card = cardsByNormalizedName.get(line.normalizedName);
    if (!card || card.rules.canBeCommander) {
      continue;
    }

    issues.push({
      code: "invalid_commander",
      severity: "blocking",
      message: "La carta dichiarata come comandante non puo' essere comandante.",
      cardName: line.rawName,
    });
  }
}

function addCardLegalityIssues(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card>,
  issues: LegalityIssue[],
): void {
  for (const line of parsedDeck.lines) {
    const card = cardsByNormalizedName.get(line.normalizedName);
    if (!card) {
      continue;
    }

    if (card.rules.commanderLegality === "banned") {
      issues.push({
        code: "banned_card",
        severity: "blocking",
        message: "La carta e' bannata in Commander.",
        cardName: line.rawName,
      });
    }

    if (card.rules.commanderLegality === "not_legal" || card.rules.commanderLegality === "restricted") {
      issues.push({
        code: "not_legal_card",
        severity: "blocking",
        message: "La carta non e' legale in Commander.",
        cardName: line.rawName,
      });
    }
  }
}

function addColorIdentityIssues(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card>,
  issues: LegalityIssue[],
): void {
  const commanderCards = getResolvedCommanderCards(parsedDeck, cardsByNormalizedName);
  if (commanderCards.length === 0) {
    return;
  }

  const commanderColorIdentity = mergeColors(commanderCards);

  for (const line of parsedDeck.lines.filter((deckLine) => deckLine.section === "mainboard")) {
    const card = cardsByNormalizedName.get(line.normalizedName);
    if (!card) {
      continue;
    }

    const illegalColors = card.rules.colorIdentity.filter((color) => !commanderColorIdentity.includes(color));
    if (illegalColors.length === 0) {
      continue;
    }

    issues.push({
      code: "color_identity_violation",
      severity: "blocking",
      message: "La carta contiene colori fuori dall'identita' colore del comandante.",
      cardName: line.rawName,
      expected: commanderColorIdentity.join("") || "colorless",
      actual: illegalColors.join(""),
    });
  }
}

function getResolvedCommanderCards(
  parsedDeck: ParsedDeck,
  cardsByNormalizedName: ReadonlyMap<string, Card> | undefined,
): readonly Card[] {
  if (!cardsByNormalizedName) {
    return [];
  }

  return parsedDeck.lines
    .filter((line) => line.section === "commander")
    .map((line) => cardsByNormalizedName.get(line.normalizedName))
    .filter((card): card is Card => Boolean(card));
}

function mergeColors(cards: readonly Card[]): readonly Color[] {
  const colors = new Set<Color>();

  for (const card of cards) {
    for (const color of card.rules.colorIdentity) {
      colors.add(color);
    }
  }

  return [...colors];
}

function hasNoMaximumDeckSizeRule(card: Card): boolean {
  return card.rules.canBeCommander && card.rules.oracleText.toLowerCase().includes("no maximum deck size");
}

function addCommanderIssues(
  parsedDeck: ParsedDeck,
  minCommanderCount: number,
  maxCommanderCount: number,
  issues: LegalityIssue[],
): void {
  const commanderQuantity = parsedDeck.sectionCounts.commander;
  const commanderLines = parsedDeck.lines.filter((line) => line.section === "commander");

  if (commanderQuantity < minCommanderCount) {
    issues.push({
      code: "missing_commander",
      severity: "blocking",
      message: "Il mazzo non contiene un comandante dichiarato.",
      expected: `${minCommanderCount}-${maxCommanderCount}`,
      actual: String(commanderQuantity),
    });
    return;
  }

  if (commanderQuantity > maxCommanderCount) {
    issues.push({
      code: "invalid_commander",
      severity: "blocking",
      message: "Il mazzo contiene troppi comandanti dichiarati per il formato Commander.",
      expected: `${minCommanderCount}-${maxCommanderCount}`,
      actual: String(commanderQuantity),
    });
  }

  for (const commanderLine of commanderLines) {
    if (commanderLine.quantity !== 1) {
      issues.push({
        code: "invalid_commander",
        severity: "blocking",
        message: "Ogni comandante dichiarato deve avere quantita' 1.",
        cardName: commanderLine.rawName,
        expected: "1",
        actual: String(commanderLine.quantity),
      });
    }
  }
}

function addDeckSizeIssues(parsedDeck: ParsedDeck, deckSizeRule: DeckSizeRule, issues: LegalityIssue[]): void {
  const commanderDeckSize = countCommanderDeckCards(parsedDeck);

  if (isValidDeckSize(commanderDeckSize, deckSizeRule)) {
    return;
  }

  issues.push({
    code: "invalid_deck_size",
    severity: "blocking",
    message: `La dimensione del mazzo non rispetta la regola applicabile: ${describeDeckSizeRule(deckSizeRule)}.`,
    expected: describeDeckSizeRule(deckSizeRule),
    actual: String(commanderDeckSize),
  });
}

function addDuplicateIssues(
  parsedDeck: ParsedDeck,
  allowedMultipleCopies: ReadonlySet<string>,
  issues: LegalityIssue[],
): void {
  const counts = new Map<string, { readonly rawName: string; quantity: number }>();

  for (const line of parsedDeck.lines) {
    if (line.section !== "commander" && line.section !== "mainboard") {
      continue;
    }

    const current = counts.get(line.normalizedName);
    if (current) {
      current.quantity += line.quantity;
    } else {
      counts.set(line.normalizedName, {
        rawName: line.rawName,
        quantity: line.quantity,
      });
    }
  }

  for (const [normalizedName, count] of counts.entries()) {
    if (count.quantity <= 1 || allowedMultipleCopies.has(normalizedName)) {
      continue;
    }

    issues.push({
      code: "duplicate_card",
      severity: "blocking",
      message: "Il mazzo contiene copie multiple di una carta non consentita dalla singleton rule.",
      cardName: count.rawName,
      expected: "1",
      actual: String(count.quantity),
    });
  }
}

function addSectionIssues(parsedDeck: ParsedDeck, allowSideboard: boolean, issues: LegalityIssue[]): void {
  if (parsedDeck.sectionCounts.unknown > 0) {
    issues.push({
      code: "ambiguous_parse",
      severity: "error",
      message: "Il mazzo contiene carte in una sezione non riconosciuta.",
      actual: String(parsedDeck.sectionCounts.unknown),
    });
  }

  if (!allowSideboard && parsedDeck.sectionCounts.sideboard > 0) {
    issues.push({
      code: "ambiguous_parse",
      severity: "warning",
      message: "Il sideboard non viene contato nel mazzo Commander principale.",
      actual: String(parsedDeck.sectionCounts.sideboard),
    });
  }
}

function calculateLegalityCap(
  parsedDeck: ParsedDeck,
  issues: readonly LegalityIssue[],
  deckSizeRule: DeckSizeRule,
): number {
  let cap = 100;
  const commanderDeckSize = countCommanderDeckCards(parsedDeck);

  cap = Math.min(cap, sizeCap(commanderDeckSize, deckSizeRule));

  for (const issue of issues) {
    if (issue.severity === "warning" || issue.severity === "info") {
      continue;
    }

    cap = Math.min(cap, issueCap(issue.code));
  }

  return cap;
}

function isValidDeckSize(actualSize: number, deckSizeRule: DeckSizeRule): boolean {
  if (deckSizeRule.exactCards !== undefined) {
    return actualSize === deckSizeRule.exactCards;
  }

  if (deckSizeRule.minCards !== undefined && actualSize < deckSizeRule.minCards) {
    return false;
  }

  if (deckSizeRule.maxCards !== undefined && actualSize > deckSizeRule.maxCards) {
    return false;
  }

  return true;
}

function describeDeckSizeRule(deckSizeRule: DeckSizeRule): string {
  if (deckSizeRule.exactCards !== undefined) {
    return `esattamente ${deckSizeRule.exactCards} carte`;
  }

  if (deckSizeRule.minCards !== undefined && deckSizeRule.maxCards !== undefined) {
    return `tra ${deckSizeRule.minCards} e ${deckSizeRule.maxCards} carte`;
  }

  if (deckSizeRule.minCards !== undefined) {
    return `almeno ${deckSizeRule.minCards} carte`;
  }

  if (deckSizeRule.maxCards !== undefined) {
    return `al massimo ${deckSizeRule.maxCards} carte`;
  }

  return "nessun vincolo di dimensione";
}

function sizeCap(actualSize: number, deckSizeRule: DeckSizeRule): number {
  if (isValidDeckSize(actualSize, deckSizeRule)) {
    return 100;
  }

  const referenceSize = deckSizeRule.exactCards ?? deckSizeRule.maxCards ?? deckSizeRule.minCards ?? DEFAULT_EXPECTED_DECK_SIZE;

  if (actualSize < referenceSize) {
    return 60;
  }

  if (actualSize <= referenceSize + 10) {
    return 70;
  }

  if (actualSize <= 150) {
    return 45;
  }

  return 25;
}

function issueCap(code: LegalityIssueCode): number {
  switch (code) {
    case "missing_commander":
      return 30;
    case "invalid_commander":
      return 40;
    case "invalid_deck_size":
      return 100;
    case "duplicate_card":
      return 70;
    case "ambiguous_parse":
      return 80;
    case "unknown_card":
      return 80;
    case "banned_card":
      return 40;
    case "not_legal_card":
      return 40;
    case "color_identity_violation":
      return 40;
    case "unsupported_partner_configuration":
      return 50;
  }
}

export function countCommanderDeckCards(parsedDeck: ParsedDeck): number {
  return parsedDeck.sectionCounts.commander + parsedDeck.sectionCounts.mainboard;
}

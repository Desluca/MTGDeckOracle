import type {
  CommanderBracket,
  CommanderBracketReport,
  CommanderLegalityReport,
  ComboEvaluation,
  DeckCard,
  DeckList,
  DetectedCombo,
} from "../domain/index.js";

export const commanderBracketLabels: Readonly<Record<CommanderBracket, string>> = {
  1: "Exhibition",
  2: "Core",
  3: "Upgraded",
  4: "Optimized",
  5: "cEDH",
};

export type BracketSignalCode =
  | "game_changers"
  | "early_two_card_infinite"
  | "late_two_card_infinite"
  | "extra_turns"
  | "mass_land_denial"
  | "broken_or_illegal"
  | "cedh_score";

export interface BracketSignal {
  readonly code: BracketSignalCode;
  readonly explanation: string;
}

export interface ClassifyCommanderBracketInput {
  readonly deck: DeckList;
  readonly finalScore: number;
  readonly legality: CommanderLegalityReport;
  readonly detectedCombos?: readonly DetectedCombo[];
  readonly comboEvaluations?: readonly ComboEvaluation[];
}

const EARLY_COMBO_MANA_THRESHOLD = 6;
const CEDH_SCORE_THRESHOLD = 93;
const BROKEN_SCORE_THRESHOLD = 20;
const SEVERE_LEGALITY_CAP = 30;

const KNOWN_GAME_CHANGER_NAMES = new Set([
  "ad nauseam",
  "chrome mox",
  "cyclonic rift",
  "deadly rollick",
  "deflecting swat",
  "demonic consultation",
  "demonic tutor",
  "drannith magistrate",
  "enlightened tutor",
  "fierce guardianship",
  "force of negation",
  "force of will",
  "gaea's cradle",
  "grim monolith",
  "imperial seal",
  "jeska's will",
  "lion's eye diamond",
  "mana crypt",
  "mana vault",
  "mox diamond",
  "mystical tutor",
  "necropotence",
  "opposition agent",
  "rhystic study",
  "smothering tithe",
  "tainted pact",
  "thassa's oracle",
  "the one ring",
  "underworld breach",
  "vampiric tutor",
]);

export function classifyCommanderBracket(input: ClassifyCommanderBracketInput): CommanderBracketReport {
  const scoredCards = playableCards(input.deck);
  const gameChangers = scoredCards.filter((deckCard) => isGameChangerCard(deckCard.card.rules.isGameChanger, deckCard.card.identity.normalizedName));
  const gameChangerNames = unique(gameChangers.map((deckCard) => deckCard.card.identity.name));
  const gameChangerCount = gameChangers.reduce((total, deckCard) => total + deckCard.quantity, 0);
  const extraTurnCount = countMatchingOracle(scoredCards, isExtraTurnText);
  const massLandDenialCount = countMatchingOracle(scoredCards, isMassLandDenialText);
  const twoCardInfinites = (input.detectedCombos ?? []).filter((combo) => isTwoCardInfinite(combo));
  const earlyTwoCard = twoCardInfinites.filter((combo) => isEarlyCombo(combo, input.comboEvaluations ?? []));
  const lateTwoCard = twoCardInfinites.filter((combo) => !isEarlyCombo(combo, input.comboEvaluations ?? []));

  const signals: BracketSignal[] = [];
  let minimumBracket: CommanderBracket = 1;

  if (gameChangerCount > 0) {
    minimumBracket = raiseBracket(minimumBracket, gameChangerCount > 3 ? 4 : 3);
    signals.push({
      code: "game_changers",
      explanation: `${gameChangerCount} Game Changer (${gameChangerNames.slice(0, 4).join(", ")}${gameChangerNames.length > 4 ? "..." : ""}).`,
    });
  }

  if (earlyTwoCard.length > 0) {
    minimumBracket = raiseBracket(minimumBracket, 4);
    signals.push({
      code: "early_two_card_infinite",
      explanation: `Combo infinita o vincente da due carte avviabile entro circa ${EARLY_COMBO_MANA_THRESHOLD} mana (${earlyTwoCard.map((combo) => combo.combo.name).join(", ")}).`,
    });
  } else if (lateTwoCard.length > 0) {
    minimumBracket = raiseBracket(minimumBracket, 3);
    signals.push({
      code: "late_two_card_infinite",
      explanation: `Combo infinita o vincente da due carte, non evidenziata come chiusura precoce (${lateTwoCard.map((combo) => combo.combo.name).join(", ")}).`,
    });
  }

  if (extraTurnCount > 0) {
    minimumBracket = raiseBracket(minimumBracket, 3);
    signals.push({
      code: "extra_turns",
      explanation: `${extraTurnCount} carte con extra turn.`,
    });
  }

  if (massLandDenialCount > 0) {
    minimumBracket = raiseBracket(minimumBracket, 4);
    signals.push({
      code: "mass_land_denial",
      explanation: `${massLandDenialCount} carte di mass land denial.`,
    });
  }

  let bracket = minimumBracket;

  if (!input.legality.isLegal && input.legality.legalityCap <= SEVERE_LEGALITY_CAP) {
    bracket = 1;
    signals.push({
      code: "broken_or_illegal",
      explanation: `Lista non valutabile come tavolo Commander: cap di legalita' ${input.legality.legalityCap}.`,
    });
  } else if (minimumBracket <= 2 && input.finalScore <= BROKEN_SCORE_THRESHOLD) {
    bracket = 1;
    signals.push({
      code: "broken_or_illegal",
      explanation: `Voto ${input.finalScore}/100: lista rotta o quasi ingiocabile, bracket Exhibition.`,
    });
  } else if (minimumBracket <= 2) {
    bracket = 2;
  } else if (minimumBracket >= 4 && input.finalScore >= CEDH_SCORE_THRESHOLD) {
    bracket = 5;
    signals.push({
      code: "cedh_score",
      explanation: `Costruzione da Optimized o superiore e voto ${input.finalScore}/100: fascia cEDH.`,
    });
  } else {
    bracket = minimumBracket;
  }

  return {
    bracket,
    label: commanderBracketLabels[bracket],
    minimumBracket,
    gameChangerCount,
    gameChangerNames,
    signals,
    explanation: explainBracket(bracket, minimumBracket, gameChangerCount, signals),
  };
}

export function isGameChangerCard(flaggedByData: boolean, normalizedName: string): boolean {
  return flaggedByData || KNOWN_GAME_CHANGER_NAMES.has(normalizedName);
}

export function composeScoreNotes(input: {
  readonly finalScore: number;
  readonly bracket: CommanderBracketReport;
  readonly customNotes?: string;
}): string {
  const generated = `Il voto ${input.finalScore}/100 misura quanto il mazzo funziona in partita (consistenza, piano, carte, combo nel contesto). Il bracket ${input.bracket.bracket} (${input.bracket.label}) arriva dalle regole di costruzione, non da una fascia del voto: un Core molto solido puo' avere un voto alto, un Upgraded costruito male puo' restare basso. ${input.bracket.explanation}`;
  return input.customNotes ? `${generated} ${input.customNotes}` : generated;
}

function explainBracket(
  bracket: CommanderBracket,
  minimumBracket: CommanderBracket,
  gameChangerCount: number,
  signals: readonly BracketSignal[],
): string {
  const signalText = signals.length > 0 ? ` Segnali: ${signals.map((signal) => signal.explanation).join(" ")}` : "";
  return `Bracket ${bracket} (${commanderBracketLabels[bracket]}). Minimo da costruzione: ${minimumBracket}. Game Changers: ${gameChangerCount}.${signalText}`;
}

function playableCards(deck: DeckList): readonly DeckCard[] {
  return deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
}

function countMatchingOracle(cards: readonly DeckCard[], match: (oracleText: string) => boolean): number {
  return cards.reduce((total, deckCard) => total + (match(deckCard.card.rules.oracleText.toLowerCase()) ? deckCard.quantity : 0), 0);
}

function isExtraTurnText(oracleText: string): boolean {
  return oracleText.includes("extra turn") || oracleText.includes("additional turn");
}

function isMassLandDenialText(oracleText: string): boolean {
  return (
    oracleText.includes("destroy all lands") ||
    (oracleText.includes("all lands") && (oracleText.includes("destroy") || oracleText.includes("sacrifice") || oracleText.includes("exile")))
  );
}

function isTwoCardInfinite(detected: DetectedCombo): boolean {
  if (detected.completeness !== "complete") {
    return false;
  }

  const requiredCount = detected.combo.pieces.filter((piece) => piece.required).length;
  if (requiredCount !== 2) {
    return false;
  }

  return detected.combo.outcomes.some((outcome) => outcome === "wins_game" || outcome.startsWith("infinite_"));
}

function isEarlyCombo(detected: DetectedCombo, evaluations: readonly ComboEvaluation[]): boolean {
  const evaluation = evaluations.find((candidate) => candidate.detectedComboId === detected.combo.id);
  const closingMana = evaluation?.closingTurnManaRequired ?? detected.combo.estimatedClosingTurnMana;
  return closingMana !== undefined && closingMana <= EARLY_COMBO_MANA_THRESHOLD;
}

function raiseBracket(current: CommanderBracket, candidate: CommanderBracket): CommanderBracket {
  return current > candidate ? current : candidate;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

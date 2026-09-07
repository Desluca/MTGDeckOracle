import { normalizeLookupName } from "../card-data/index.js";
import type {
  Card,
  ComboEvaluation,
  ComboOutcome,
  CommanderComboRole,
  DeckList,
  DetectedCombo,
} from "../domain/index.js";

export function evaluateDetectedCombo(detectedCombo: DetectedCombo, deck: DeckList): ComboEvaluation {
  const cardMap = createDeckCardMap(deck);
  const commanderNames = new Set(deck.commander.commanders.map((deckCard) => deckCard.card.identity.normalizedName));
  const requiredPieceNames = detectedCombo.combo.pieces.filter((piece) => piece.required).map((piece) => piece.cardName);
  const requiredPieceCount = requiredPieceNames.length;
  const totalManaValue = sumManaValue(requiredPieceNames, cardMap);
  const commanderRole = inferCommanderRole(detectedCombo, deck, commanderNames);
  const tutorAccessScore = calculateTutorAccessScore(deck);
  const protectionScore = calculateProtectionScore(deck);
  const fragilityScore = calculateFragilityScore(requiredPieceCount, detectedCombo.missingPieces.length, protectionScore);
  const impactScore = clampScore(
    payoffScore(detectedCombo.combo.outcomes) *
      completenessMultiplier(detectedCombo.completeness) *
      pieceCountMultiplier(requiredPieceCount) *
      commanderRoleMultiplier(commanderRole) *
      accessMultiplier(tutorAccessScore) *
      speedMultiplier(detectedCombo.combo.estimatedSpeed) *
      protectionMultiplier(protectionScore) -
      fragilityScore * 0.15,
  );

  return {
    detectedComboId: detectedCombo.combo.id,
    impactScore,
    speed: detectedCombo.combo.estimatedSpeed ?? "unknown",
    totalManaValue,
    ...(detectedCombo.combo.estimatedClosingTurnMana !== undefined
      ? { closingTurnManaRequired: detectedCombo.combo.estimatedClosingTurnMana }
      : {}),
    commanderRole,
    tutorAccessScore,
    protectionScore,
    fragilityScore,
    explanation: explainCombo(detectedCombo, impactScore, commanderRole, totalManaValue),
  };
}

export function evaluateDetectedCombos(
  detectedCombos: readonly DetectedCombo[],
  deck: DeckList,
): readonly ComboEvaluation[] {
  return detectedCombos.map((detectedCombo) => evaluateDetectedCombo(detectedCombo, deck));
}

function createDeckCardMap(deck: DeckList): ReadonlyMap<string, Card> {
  return new Map(deck.cards.map((deckCard) => [deckCard.card.identity.normalizedName, deckCard.card]));
}

function sumManaValue(cardNames: readonly string[], cardMap: ReadonlyMap<string, Card>): number {
  return cardNames.reduce((total, cardName) => {
    const card = cardMap.get(normalizeLookupName(cardName));
    return total + (card?.rules.manaValue ?? 0);
  }, 0);
}

function inferCommanderRole(
  detectedCombo: DetectedCombo,
  deck: DeckList,
  commanderNames: ReadonlySet<string>,
): CommanderComboRole {
  const comboPieceNames = detectedCombo.combo.pieces.flatMap((piece) => [piece.cardName, ...(piece.alternatives ?? [])]);
  const commanderIsPiece = comboPieceNames.some((name) => commanderNames.has(normalizeLookupName(name)));

  if (commanderIsPiece) {
    return "piece";
  }

  const commanderTags = deck.commander.commanders.flatMap((deckCard) => deckCard.card.evaluation.functionalTags);
  if (commanderTags.includes("tutor")) {
    return "tutor";
  }

  if (commanderTags.includes("protection")) {
    return "protection";
  }

  if (commanderTags.includes("combo_piece") || commanderTags.includes("commander_synergy")) {
    return "enabler";
  }

  return "none";
}

function calculateTutorAccessScore(deck: DeckList): number {
  const tutorCount = deck.cards.reduce(
    (count, deckCard) => count + (deckCard.card.evaluation.functionalTags.includes("tutor") ? deckCard.quantity : 0),
    0,
  );

  return Math.min(100, tutorCount * 15);
}

function calculateProtectionScore(deck: DeckList): number {
  const protectionCount = deck.cards.reduce(
    (count, deckCard) =>
      count +
      (deckCard.card.evaluation.functionalTags.includes("protection") ||
      deckCard.card.evaluation.functionalTags.includes("counterspell")
        ? deckCard.quantity
        : 0),
    0,
  );

  return Math.min(100, protectionCount * 12);
}

function calculateFragilityScore(pieceCount: number, missingPieceCount: number, protectionScore: number): number {
  return Math.max(0, Math.min(100, pieceCount * 12 + missingPieceCount * 25 - protectionScore * 0.25));
}

function payoffScore(outcomes: readonly ComboOutcome[]): number {
  if (outcomes.includes("wins_game") || outcomes.includes("infinite_damage") || outcomes.includes("infinite_mill")) {
    return 95;
  }

  if (outcomes.includes("infinite_mana") || outcomes.includes("infinite_draw") || outcomes.includes("lock")) {
    return 75;
  }

  if (outcomes.includes("infinite_tokens") || outcomes.includes("infinite_life")) {
    return 65;
  }

  return 40;
}

function completenessMultiplier(completeness: DetectedCombo["completeness"]): number {
  switch (completeness) {
    case "complete":
      return 1;
    case "partial":
      return 0.35;
    case "missing_key_piece":
      return 0.1;
  }
}

function pieceCountMultiplier(pieceCount: number): number {
  if (pieceCount <= 2) {
    return 1.1;
  }

  if (pieceCount === 3) {
    return 0.9;
  }

  return 0.7;
}

function commanderRoleMultiplier(commanderRole: CommanderComboRole): number {
  switch (commanderRole) {
    case "piece":
      return 1.2;
    case "tutor":
    case "enabler":
      return 1.12;
    case "protection":
      return 1.08;
    case "payoff":
      return 1.05;
    case "none":
      return 1;
  }
}

function accessMultiplier(tutorAccessScore: number): number {
  return 1 + tutorAccessScore / 500;
}

function speedMultiplier(speed: DetectedCombo["combo"]["estimatedSpeed"]): number {
  switch (speed) {
    case "instant":
      return 1.08;
    case "sorcery":
      return 1;
    case "unknown":
    case undefined:
      return 0.95;
  }
}

function protectionMultiplier(protectionScore: number): number {
  return 1 + protectionScore / 600;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function explainCombo(
  detectedCombo: DetectedCombo,
  impactScore: number,
  commanderRole: CommanderComboRole,
  totalManaValue: number,
): string {
  return `${detectedCombo.combo.name} ha impatto ${impactScore}/100: ${detectedCombo.completeness}, ${detectedCombo.combo.pieces.length} pezzi, mana value totale ${totalManaValue}, ruolo comandante ${commanderRole}.`;
}

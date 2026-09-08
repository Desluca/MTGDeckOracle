import { describe, expect, it } from "vitest";

import { detectCombo, evaluateDetectedCombo } from "../../src/combo/index.js";
import type { KnownCombo } from "../../src/domain/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("evaluateDetectedCombo", () => {
  it("gives high impact to compact complete game-winning combos", () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Combo Commander", required: true },
        { cardName: "Win Piece", required: true },
      ],
      outcomes: ["wins_game"],
      estimatedSpeed: "instant",
      estimatedClosingTurnMana: 2,
    });
    const commander = createTestCard({
      name: "Combo Commander",
      canBeCommander: true,
      manaValue: 2,
      functionalTags: ["combo_piece"],
    });
    const deck = createResolvedTestDeck({
      commanders: [commander],
      mainboard: [
        mainboardCard(createTestCard({ name: "Win Piece", manaValue: 2 })),
        mainboardCard(createTestCard({ name: "Tutor", functionalTags: ["tutor"] }), 2),
        mainboardCard(createTestCard({ name: "Protection", functionalTags: ["protection"] }), 2),
      ],
    });
    const detected = detectCombo(combo, new Set(["combo commander", "win piece"]));

    const evaluation = evaluateDetectedCombo(detected, deck);

    expect(evaluation.impactScore).toBeGreaterThanOrEqual(90);
    expect(evaluation.commanderRole).toBe("piece");
    expect(evaluation.speed).toBe("instant");
    expect(evaluation.closingTurnManaRequired).toBe(2);
  });

  it("scores partial combos much lower than complete combos", () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Piece A", required: true },
        { cardName: "Piece B", required: true },
      ],
    });
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Piece A", manaValue: 2 }))],
    });
    const complete = detectCombo(combo, new Set(["piece a", "piece b"]));
    const partial = detectCombo(combo, new Set(["piece a"]));

    const completeEvaluation = evaluateDetectedCombo(complete, deck);
    const partialEvaluation = evaluateDetectedCombo(partial, deck);

    expect(partialEvaluation.impactScore).toBeLessThan(completeEvaluation.impactScore);
  });

  it("recognizes a commander that helps by tutoring", () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Piece A", required: true },
        { cardName: "Piece B", required: true },
      ],
    });
    const commander = createTestCard({
      name: "Tutor Commander",
      canBeCommander: true,
      functionalTags: ["tutor"],
    });
    const deck = createResolvedTestDeck({
      commanders: [commander],
      mainboard: [
        mainboardCard(createTestCard({ name: "Piece A" })),
        mainboardCard(createTestCard({ name: "Piece B" })),
      ],
    });
    const detected = detectCombo(combo, new Set(["piece a", "piece b"]));

    const evaluation = evaluateDetectedCombo(detected, deck);

    expect(evaluation.commanderRole).toBe("tutor");
    expect(evaluation.tutorAccessScore).toBeGreaterThan(0);
  });

  it("scores value engines lower than game-winning combos", () => {
    const winningCombo = createCombo({ id: "win", outcomes: ["wins_game"] });
    const valueCombo = createCombo({ id: "value", outcomes: ["value_engine"] });
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Piece A" })),
        mainboardCard(createTestCard({ name: "Piece B" })),
      ],
    });
    const detectedWin = detectCombo(winningCombo, new Set(["piece a", "piece b"]));
    const detectedValue = detectCombo(valueCombo, new Set(["piece a", "piece b"]));

    expect(evaluateDetectedCombo(detectedValue, deck).impactScore).toBeLessThan(
      evaluateDetectedCombo(detectedWin, deck).impactScore,
    );
  });

  it("keeps commander role none when the commander is unrelated", () => {
    const combo = createCombo();
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Piece A" })),
        mainboardCard(createTestCard({ name: "Piece B" })),
      ],
    });
    const detected = detectCombo(combo, new Set(["piece a", "piece b"]));

    expect(evaluateDetectedCombo(detected, deck).commanderRole).toBe("none");
  });

  it("scores missing key pieces below partial combos", () => {
    const combo = createCombo();
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Unrelated Card" }))],
    });
    const missing = detectCombo(combo, new Set());
    const partial = detectCombo(combo, new Set(["piece a"]));

    expect(missing.completeness).toBe("missing_key_piece");
    expect(evaluateDetectedCombo(missing, deck).impactScore).toBeLessThan(evaluateDetectedCombo(partial, deck).impactScore);
  });

  it("scores locks below game-winning combos but above generic value", () => {
    const winningCombo = createCombo({ id: "win", outcomes: ["wins_game"] });
    const lockCombo = createCombo({ id: "lock", outcomes: ["lock"] });
    const valueCombo = createCombo({ id: "value", outcomes: ["value_engine"] });
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Piece A" })),
        mainboardCard(createTestCard({ name: "Piece B" })),
      ],
    });
    const names = new Set(["piece a", "piece b"]);

    const lockScore = evaluateDetectedCombo(detectCombo(lockCombo, names), deck).impactScore;
    expect(lockScore).toBeLessThan(evaluateDetectedCombo(detectCombo(winningCombo, names), deck).impactScore);
    expect(lockScore).toBeGreaterThan(evaluateDetectedCombo(detectCombo(valueCombo, names), deck).impactScore);
  });
});

function createCombo(overrides: Partial<KnownCombo> = {}): KnownCombo {
  return {
    id: "combo-1",
    name: "Test Combo",
    source: "manual",
    pieces: [
      { cardName: "Piece A", required: true },
      { cardName: "Piece B", required: true },
    ],
    outcomes: ["wins_game"],
    estimatedSpeed: "sorcery",
    ...overrides,
  };
}

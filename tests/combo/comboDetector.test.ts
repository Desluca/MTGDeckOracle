import { describe, expect, it } from "vitest";

import { detectDeckCombos, InMemoryComboDataSource } from "../../src/combo/index.js";
import type { KnownCombo } from "../../src/domain/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("detectDeckCombos", () => {
  it("detects a complete two-card combo", async () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Combo Piece A", required: true },
        { cardName: "Combo Piece B", required: true },
      ],
    });
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Combo Piece A" })),
        mainboardCard(createTestCard({ name: "Combo Piece B" })),
      ],
    });

    const detected = await detectDeckCombos(deck, new InMemoryComboDataSource([combo]));

    expect(detected).toHaveLength(1);
    expect(detected[0]).toMatchObject({
      completeness: "complete",
      presentPieces: ["Combo Piece A", "Combo Piece B"],
      missingPieces: [],
    });
  });

  it("detects a partial combo when a required piece is missing", async () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Combo Piece A", required: true },
        { cardName: "Combo Piece B", required: true },
      ],
    });
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Combo Piece A" }))],
    });

    const detected = await detectDeckCombos(deck, new InMemoryComboDataSource([combo]));

    expect(detected[0]).toMatchObject({
      completeness: "partial",
      presentPieces: ["Combo Piece A"],
      missingPieces: ["Combo Piece B"],
    });
  });

  it("supports alternative pieces", async () => {
    const combo = createCombo({
      pieces: [
        { cardName: "Primary Piece", required: true, alternatives: ["Alternative Piece"] },
        { cardName: "Payoff Piece", required: true },
      ],
    });
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Alternative Piece" })),
        mainboardCard(createTestCard({ name: "Payoff Piece" })),
      ],
    });

    const detected = await detectDeckCombos(deck, new InMemoryComboDataSource([combo]));

    expect(detected[0]?.completeness).toBe("complete");
    expect(detected[0]?.presentPieces).toEqual(["Primary Piece", "Payoff Piece"]);
  });

  it("does not return combos with no present pieces", async () => {
    const combo = createCombo({
      pieces: [{ cardName: "Missing Piece", required: true }],
    });
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Random Card" }))],
    });

    const detected = await detectDeckCombos(deck, new InMemoryComboDataSource([combo]));

    expect(detected).toEqual([]);
  });
});

function createCombo(overrides: Partial<KnownCombo> = {}): KnownCombo {
  return {
    id: "combo-1",
    name: "Test Combo",
    source: "manual",
    pieces: [],
    outcomes: ["wins_game"],
    ...overrides,
  };
}

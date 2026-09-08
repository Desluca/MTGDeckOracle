import { describe, expect, it } from "vitest";

import { classifyCommanderBracket } from "../../src/scoring/index.js";
import type { CommanderLegalityReport, DetectedCombo } from "../../src/domain/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("classifyCommanderBracket", () => {
  it("keeps a high-scoring deck in Core without Game Changers or two-card wins", () => {
    const report = classifyCommanderBracket({
      deck: createResolvedTestDeck({
        mainboard: [mainboardCard(createTestCard({ name: "Sol Ring" }), 1)],
      }),
      finalScore: 75,
      legality: legalReport(),
    });

    expect(report.bracket).toBe(2);
    expect(report.label).toBe("Core");
    expect(report.gameChangerCount).toBe(0);
  });

  it("places a poorly built deck with three Game Changers in Upgraded", () => {
    const report = classifyCommanderBracket({
      deck: createResolvedTestDeck({
        mainboard: [
          mainboardCard(createTestCard({ name: "Demonic Tutor", isGameChanger: true })),
          mainboardCard(createTestCard({ name: "Rhystic Study", isGameChanger: true })),
          mainboardCard(createTestCard({ name: "Cyclonic Rift", isGameChanger: true })),
        ],
      }),
      finalScore: 60,
      legality: legalReport(),
    });

    expect(report.bracket).toBe(3);
    expect(report.gameChangerCount).toBe(3);
    expect(report.minimumBracket).toBe(3);
  });

  it("uses score only to split Optimized and cEDH", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Mana Vault", isGameChanger: true }), 1)],
    });
    const combos = [earlyTwoCardWin()];

    expect(
      classifyCommanderBracket({
        deck,
        finalScore: 92,
        legality: legalReport(),
        detectedCombos: combos,
      }).bracket,
    ).toBe(4);

    expect(
      classifyCommanderBracket({
        deck,
        finalScore: 93,
        legality: legalReport(),
        detectedCombos: combos,
      }).bracket,
    ).toBe(5);
  });
});

function legalReport(): CommanderLegalityReport {
  return { isLegal: true, legalityCap: 100, issues: [] };
}

function earlyTwoCardWin(): DetectedCombo {
  return {
    combo: {
      id: "isochron-dramatic",
      name: "Isochron Scepter + Dramatic Reversal",
      source: "manual",
      pieces: [
        { cardName: "Isochron Scepter", required: true },
        { cardName: "Dramatic Reversal", required: true },
      ],
      outcomes: ["infinite_mana"],
      estimatedClosingTurnMana: 3,
    },
    completeness: "complete",
    presentPieces: ["Isochron Scepter", "Dramatic Reversal"],
    missingPieces: [],
  };
}

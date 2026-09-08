import { describe, expect, it } from "vitest";

import { analyzeConsistency } from "../../src/consistency/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("analyzeConsistency", () => {
  it("creates probability signals for key deck functions", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 10),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 10),
        mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"] }), 3),
      ],
    });

    const analysis = analyzeConsistency(deck);

    expect(analysis.signals.map((signal) => signal.name)).toEqual([
      "early_land_access",
      "early_ramp_access",
      "card_advantage_access",
      "interaction_access",
      "tutor_access",
      "win_condition_access",
    ]);
    expect(analysis.librarySize).toBe(60);
    expect(analysis.deckSize).toBe(61);
    expect(analysis.score).toBeGreaterThan(0);
  });

  it("excludes the command zone from the drawable library", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Command Zone Land",
          types: ["land"],
          typeLine: "Legendary Land",
          canBeCommander: true,
        }),
      ],
      mainboard: [mainboardCard(createTestCard({ name: "Spell", manaValue: 2 }), 99)],
    });

    const analysis = analyzeConsistency(deck);
    const landAccess = analysis.signals.find((signal) => signal.name === "early_land_access");

    expect(analysis.librarySize).toBe(99);
    expect(landAccess?.probability).toBe(0);
  });

  it("reduces consistency for larger decks against a 100-card baseline", () => {
    const hundredCardDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }), 99),
      ],
    });
    const twoHundredCardDeck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }), 199),
      ],
    });

    expect(analyzeConsistency(twoHundredCardDeck).sizeMultiplier).toBeLessThan(analyzeConsistency(hundredCardDeck).sizeMultiplier);
    expect(analyzeConsistency(hundredCardDeck).sizeMultiplier).toBe(1);
  });

  it("reports no land access when the deck has no lands", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Spell", manaValue: 2 }), 99)],
    });

    const analysis = analyzeConsistency(deck);
    const landAccess = analysis.signals.find((signal) => signal.name === "early_land_access");

    expect(landAccess?.probability).toBe(0);
  });

  it("counts combo payoffs as win-condition access", () => {
    const withPayoff = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Island" }), 37),
        mainboardCard(createTestCard({ name: "Payoff", functionalTags: ["combo_payoff"] }), 4),
      ],
    });
    const withoutPayoff = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Land", types: ["land"], typeLine: "Basic Land — Island" }), 37)],
    });

    const withPayoffAccess = analyzeConsistency(withPayoff).signals.find((signal) => signal.name === "win_condition_access")?.probability ?? 0;
    const withoutPayoffAccess = analyzeConsistency(withoutPayoff).signals.find((signal) => signal.name === "win_condition_access")?.probability ?? 0;

    expect(withPayoffAccess).toBeGreaterThan(withoutPayoffAccess);
  });

  it("lets tutors raise win-condition access only when a win piece is in the library", () => {
    const lands = mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 37);
    const win = mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"] }), 1);
    const tutors = mainboardCard(createTestCard({ name: "Tutor", functionalTags: ["tutor"] }), 4);
    const withWinAndTutors = createResolvedTestDeck({
      mainboard: [lands, win, tutors],
    });
    const withWinOnly = createResolvedTestDeck({
      mainboard: [lands, win],
    });
    const tutorsOnly = createResolvedTestDeck({
      mainboard: [lands, tutors],
    });

    const withTutors = signal(withWinAndTutors, "win_condition_access");
    const withoutTutors = signal(withWinOnly, "win_condition_access");
    const tutorsWithoutWin = signal(tutorsOnly, "win_condition_access");

    expect(withTutors).toBeGreaterThan(withoutTutors);
    expect(tutorsWithoutWin).toBe(0);
    expect(signal(tutorsOnly, "tutor_access")).toBeGreaterThan(0);
  });

  it("treats a commander win piece as available from the command zone", () => {
    const libraryOnly = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 99)],
    });
    const commanderWin = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Win Commander",
          canBeCommander: true,
          functionalTags: ["win_condition"],
        }),
      ],
      mainboard: [mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 99)],
    });

    expect(signal(commanderWin, "win_condition_access")).toBeGreaterThan(signal(libraryOnly, "win_condition_access"));
    expect(signal(commanderWin, "win_condition_access")).toBeGreaterThan(0.6);
  });

  it("scores interaction access separately from win conditions", () => {
    const withInteraction = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 37),
        mainboardCard(createTestCard({ name: "Counterspell", functionalTags: ["counterspell"] }), 8),
      ],
    });
    const withoutInteraction = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Island", types: ["land"], typeLine: "Basic Land — Island" }), 37)],
    });

    expect(signal(withInteraction, "interaction_access")).toBeGreaterThan(signal(withoutInteraction, "interaction_access"));
  });

  it("raises redundancy when key roles have more copies", () => {
    const sparse = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 2),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 2),
        mainboardCard(createTestCard({ name: "Removal", functionalTags: ["spot_removal"] }), 1),
        mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"] }), 1),
      ],
    });
    const dense = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }), 37),
        mainboardCard(createTestCard({ name: "Ramp", functionalTags: ["ramp"] }), 10),
        mainboardCard(createTestCard({ name: "Draw", functionalTags: ["card_draw"] }), 10),
        mainboardCard(createTestCard({ name: "Removal", functionalTags: ["spot_removal"] }), 8),
        mainboardCard(createTestCard({ name: "Win", functionalTags: ["win_condition"] }), 4),
      ],
    });

    expect(analyzeConsistency(dense).redundancyScore).toBeGreaterThan(analyzeConsistency(sparse).redundancyScore);
    expect(analyzeConsistency(dense).score).toBeGreaterThan(analyzeConsistency(sparse).score);
  });
});

function signal(deck: ReturnType<typeof createResolvedTestDeck>, name: string): number {
  return analyzeConsistency(deck).signals.find((entry) => entry.name === name)?.probability ?? 0;
}

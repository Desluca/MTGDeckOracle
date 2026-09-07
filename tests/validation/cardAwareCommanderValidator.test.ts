import { describe, expect, it } from "vitest";

import { createCardMap, createTestCard } from "../utils/cardFactory.js";
import { parseDeckList } from "../../src/parser/index.js";
import { validateCommanderDeck } from "../../src/validation/index.js";

describe("validateCommanderDeck with card data", () => {
  it("flags unknown cards", () => {
    const parsed = parseDeckList("Commander\n1 Test Commander\nDeck\n98 Forest\n1 Missing Card");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "Test Commander", canBeCommander: true }),
      createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(80);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "unknown_card",
        cardName: "Missing Card",
      }),
    );
  });

  it("flags banned Commander cards", () => {
    const parsed = parseDeckList("Commander\n1 Test Commander\nDeck\n98 Forest\n1 Banned Spell");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "Test Commander", canBeCommander: true }),
      createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }),
      createTestCard({ name: "Banned Spell", commanderLegality: "banned" }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "banned_card" }));
  });

  it("flags cards that are not legal in Commander", () => {
    const parsed = parseDeckList("Commander\n1 Test Commander\nDeck\n98 Forest\n1 Silver-Bordered Spell");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "Test Commander", canBeCommander: true }),
      createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }),
      createTestCard({ name: "Silver-Bordered Spell", commanderLegality: "not_legal" }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "not_legal_card" }));
  });

  it("flags cards declared as commander that cannot be commanders", () => {
    const parsed = parseDeckList("Commander\n1 Sol Ring\nDeck\n99 Forest");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "Sol Ring", typeLine: "Artifact", types: ["artifact"], canBeCommander: false }),
      createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "invalid_commander" }));
  });

  it("flags color identity violations", () => {
    const parsed = parseDeckList("Commander\n1 White Commander\nDeck\n98 Plains\n1 Counterspell");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "White Commander", colorIdentity: ["W"], canBeCommander: true }),
      createTestCard({ name: "Plains", colorIdentity: ["W"], types: ["land"], typeLine: "Basic Land — Plains" }),
      createTestCard({ name: "Counterspell", colors: ["U"], colorIdentity: ["U"] }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "color_identity_violation",
        cardName: "Counterspell",
        expected: "W",
        actual: "U",
      }),
    );
  });

  it("allows legal cards inside commander color identity", () => {
    const parsed = parseDeckList("Commander\n1 Azorius Commander\nDeck\n98 Plains\n1 Counterspell");
    const cardsByNormalizedName = createCardMap([
      createTestCard({ name: "Azorius Commander", colorIdentity: ["W", "U"], canBeCommander: true }),
      createTestCard({ name: "Plains", colorIdentity: ["W"], types: ["land"], typeLine: "Basic Land — Plains" }),
      createTestCard({ name: "Counterspell", colors: ["U"], colorIdentity: ["U"] }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
  });

  it("infers no maximum deck size from a commander rulebreaker", () => {
    const parsed = parseDeckList("Commander\n1 Whtz, the Bibliophile\nDeck\n199 Wastes");
    const cardsByNormalizedName = createCardMap([
      createTestCard({
        name: "Whtz, the Bibliophile",
        colorIdentity: ["W", "U"],
        canBeCommander: true,
        oracleText: "Rulebreaker — A deck with this commander has no maximum deck size.",
      }),
      createTestCard({ name: "Wastes", types: ["land"], typeLine: "Basic Land — Wastes" }),
    ]);

    const report = validateCommanderDeck(parsed, { cardsByNormalizedName });

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
    expect(report.issues).toEqual([]);
  });
});

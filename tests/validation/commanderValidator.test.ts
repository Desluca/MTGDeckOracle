import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseDeckList } from "../../src/parser/index.js";
import { countCommanderDeckCards, validateCommanderDeck } from "../../src/validation/index.js";
import { generateCommanderDeck, generateDeckWithBasicLands } from "../utils/deckBuilder.js";

const fixturesPath = join(process.cwd(), "tests", "fixtures", "decks");

function validateDeckText(deckText: string) {
  return validateCommanderDeck(parseDeckList(deckText));
}

function readDeckFixture(fileName: string): string {
  return readFileSync(join(fixturesPath, fileName), "utf8");
}

describe("validateCommanderDeck", () => {
  it("accepts a generated 100-card Commander deck", () => {
    const report = validateDeckText(generateCommanderDeck());

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
    expect(report.issues).toEqual([]);
  });

  it("accepts a fixture with repeated basic lands", () => {
    const report = validateDeckText(readDeckFixture("minimal-valid.deck"));

    expect(report.isLegal).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("counts only commander and mainboard as Commander deck size", () => {
    const parsed = parseDeckList(`${generateCommanderDeck()}\nSideboard\n1 Sol Ring`);

    expect(countCommanderDeckCards(parsed)).toBe(100);
  });

  it("warns about sideboard without making an otherwise valid deck illegal", () => {
    const report = validateDeckText(`${generateCommanderDeck()}\nSideboard\n1 Sol Ring`);

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "ambiguous_parse",
        severity: "warning",
      }),
    );
  });

  it("allows sideboard warning to be disabled", () => {
    const parsed = parseDeckList(`${generateCommanderDeck()}\nSideboard\n1 Sol Ring`);
    const report = validateCommanderDeck(parsed, { allowSideboard: true });

    expect(report.issues).toEqual([]);
  });

  it("rejects a deck without commander", () => {
    const report = validateDeckText(readDeckFixture("missing-commander.deck"));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(30);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "missing_commander",
        severity: "blocking",
      }),
    );
  });

  it("rejects a deck with too many commanders", () => {
    const report = validateDeckText(generateCommanderDeck({ commanderCount: 3, mainboardCount: 97 }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "invalid_commander" }));
  });

  it("rejects commander quantities above one", () => {
    const report = validateDeckText("Commander\n2 Test Commander\nDeck\n98 Forest");

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid_commander",
        cardName: "Test Commander",
        actual: "2",
      }),
    );
  });

  it("allows two commanders for partner-style configurations", () => {
    const report = validateDeckText(generateCommanderDeck({ commanderCount: 2, mainboardCount: 98 }));

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
  });

  it("rejects decks below 100 cards", () => {
    const report = validateDeckText(generateCommanderDeck({ mainboardCount: 50 }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(60);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "invalid_deck_size" }));
  });

  it("caps 101-110 card decks at 70", () => {
    const report = validateDeckText(generateCommanderDeck({ mainboardCount: 104 }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(70);
  });

  it("caps 111-150 card decks at 45", () => {
    const report = validateDeckText(generateCommanderDeck({ mainboardCount: 129 }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(45);
  });

  it("caps illegal decks above 150 cards at 25 by default", () => {
    const report = validateDeckText(generateCommanderDeck({ mainboardCount: 199 }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(25);
  });

  it("specifically catches the 200-card anti-abuse case when no size exception applies", () => {
    const report = validateDeckText(generateCommanderDeck({ mainboardCount: 199, namePrefix: "Strong Card" }));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(25);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid_deck_size",
        expected: "esattamente 100 carte",
        actual: "200",
      }),
    );
  });

  it("allows a 200-card deck when a commander rule removes the maximum deck size", () => {
    const parsed = parseDeckList(generateCommanderDeck({ mainboardCount: 199, namePrefix: "Whtz Library Card" }));
    const report = validateCommanderDeck(parsed, {
      deckSizeRule: {
        minCards: 100,
        source: "commander_rulebreaker",
        description: "Whtz, the Bibliophile removes the maximum deck size.",
      },
    });

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
    expect(report.issues).toEqual([]);
  });

  it("still rejects undersized decks when a commander removes only the maximum deck size", () => {
    const parsed = parseDeckList(generateCommanderDeck({ mainboardCount: 80 }));
    const report = validateCommanderDeck(parsed, {
      deckSizeRule: {
        minCards: 100,
        source: "commander_rulebreaker",
      },
    });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(60);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid_deck_size",
        expected: "almeno 100 carte",
        actual: "81",
      }),
    );
  });

  it("rejects duplicate non-basic cards", () => {
    const report = validateDeckText(readDeckFixture("duplicate-nonbasic.deck"));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(70);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate_card",
        cardName: "Sol Ring",
        actual: "2",
      }),
    );
  });

  it("rejects duplicates split across multiple lines", () => {
    const report = validateDeckText(["Commander", "1 Test Commander", "Deck", "1 Sol Ring", "1 Sol Ring", "97 Forest"].join("\n"));

    expect(report.isLegal).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "duplicate_card" }));
  });

  it("rejects a commander duplicated in the mainboard", () => {
    const report = validateDeckText(["Commander", "1 Test Commander", "Deck", "1 Test Commander", "98 Forest"].join("\n"));

    expect(report.isLegal).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate_card",
        cardName: "Test Commander",
        actual: "2",
      }),
    );
  });

  it("allows any number of basic lands", () => {
    const report = validateDeckText(generateDeckWithBasicLands(45));

    expect(report.isLegal).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("allows cards with explicit many-copy rules", () => {
    const report = validateDeckText(["Commander", "1 Test Commander", "Deck", "20 Persistent Petitioners", "79 Forest"].join("\n"));

    expect(report.isLegal).toBe(true);
  });

  it("supports custom many-copy exceptions", () => {
    const parsed = parseDeckList(["Commander", "1 Test Commander", "Deck", "2 Custom Colony", "97 Forest"].join("\n"));
    const report = validateCommanderDeck(parsed, {
      allowedMultipleCopies: new Set(["forest", "custom colony"]),
    });

    expect(report.isLegal).toBe(true);
  });

  it("flags unknown sections as illegal because cards cannot be trusted", () => {
    const report = validateDeckText(readDeckFixture("unknown-section.deck"));

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(80);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "ambiguous_parse",
        severity: "error",
      }),
    );
  });

  it("keeps the strictest cap when multiple issues exist", () => {
    const report = validateDeckText("Deck\n2 Sol Ring");

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(30);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing_commander", "invalid_deck_size", "duplicate_card"]),
    );
  });

  it("supports custom expected deck size for future formats or tests", () => {
    const parsed = parseDeckList(generateCommanderDeck({ mainboardCount: 59 }));
    const report = validateCommanderDeck(parsed, { expectedDeckSize: 60 });

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
  });

  it("supports stricter single-commander validation", () => {
    const parsed = parseDeckList(generateCommanderDeck({ commanderCount: 2, mainboardCount: 98 }));
    const report = validateCommanderDeck(parsed, { maxCommanderCount: 1 });

    expect(report.isLegal).toBe(false);
    expect(report.legalityCap).toBe(40);
  });

  it("translates parser errors into legality issues", () => {
    const report = validateDeckText("Commander\n1 Test Commander\nDeck\n0 Sol Ring\n98 Forest");

    expect(report.isLegal).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "ambiguous_parse",
        severity: "error",
      }),
    );
  });

  it("does not count maybeboard cards toward deck size", () => {
    const report = validateDeckText(`${generateCommanderDeck()}\nMaybeboard\n1 Sol Ring`);

    expect(report.isLegal).toBe(true);
    expect(report.legalityCap).toBe(100);
  });

  it("detects invalid size even when maybeboard would make the total look correct", () => {
    const report = validateDeckText(`${generateCommanderDeck({ mainboardCount: 98 })}\nMaybeboard\n1 Sol Ring`);

    expect(report.isLegal).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid_deck_size",
        actual: "99",
      }),
    );
  });
});

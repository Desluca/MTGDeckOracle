import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cleanCardName, normalizeCardName, parseDeckList } from "../../src/parser/index.js";

const fixturesPath = join(process.cwd(), "tests", "fixtures", "decks");

function readDeckFixture(fileName: string): string {
  return readFileSync(join(fixturesPath, fileName), "utf8");
}

const hundredCardSingleCommanderDecks = readdirSync(join(fixturesPath, "real"))
  .filter((fileName) => fileName.endsWith(".deck"))
  .filter((fileName) => !["thrasios-tymna-cedh.deck", "whtz-120.deck", "kinnan-illegal-size.deck"].includes(fileName))
  .map((fileName) => `real/${fileName}`);

describe("parseDeckList", () => {
  it("parses a minimal valid fixture", () => {
    const parsed = parseDeckList(readDeckFixture("minimal-valid.deck"));

    expect(parsed.issues).toEqual([]);
    expect(parsed.sectionCounts.commander).toBe(1);
    expect(parsed.sectionCounts.mainboard).toBe(99);
    expect(parsed.totalQuantity).toBe(100);
  });

  for (const fileName of hundredCardSingleCommanderDecks) {
    it(`parses ${fileName} as a 100-card commander list`, () => {
      const parsed = parseDeckList(readDeckFixture(fileName));

      expect(parsed.issues.filter((issue) => issue.severity === "error")).toEqual([]);
      expect(parsed.sectionCounts.commander).toBe(1);
      expect(parsed.sectionCounts.mainboard).toBe(99);
      expect(parsed.totalQuantity).toBe(100);
    });
  }

  it("parses a two-commander cEDH list", () => {
    const parsed = parseDeckList(readDeckFixture("real/thrasios-tymna-cedh.deck"));

    expect(parsed.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(parsed.sectionCounts.commander).toBe(2);
    expect(parsed.sectionCounts.mainboard).toBe(98);
    expect(parsed.totalQuantity).toBe(100);
  });

  it("parses an oversized Whtz list", () => {
    const parsed = parseDeckList(readDeckFixture("real/whtz-120.deck"));

    expect(parsed.sectionCounts.commander).toBe(1);
    expect(parsed.totalQuantity).toBe(120);
  });

  it("parses an illegally oversized Kinnan list", () => {
    const parsed = parseDeckList(readDeckFixture("real/kinnan-illegal-size.deck"));

    expect(parsed.totalQuantity).toBe(101);
  });

  it("parses quantity followed by card name", () => {
    const parsed = parseDeckList("1 Sol Ring");

    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0]).toMatchObject({
      quantity: 1,
      rawName: "Sol Ring",
      normalizedName: "sol ring",
      section: "mainboard",
    });
  });

  it("parses quantity with x suffix", () => {
    const parsed = parseDeckList("3x Forest");

    expect(parsed.lines[0]?.quantity).toBe(3);
    expect(parsed.lines[0]?.rawName).toBe("Forest");
  });

  it("parses quantity with spaced x suffix", () => {
    const parsed = parseDeckList("3 x Forest");

    expect(parsed.lines[0]?.quantity).toBe(3);
    expect(parsed.lines[0]?.rawName).toBe("Forest");
  });

  it("defaults missing quantity to one", () => {
    const parsed = parseDeckList("Sol Ring");

    expect(parsed.lines[0]?.quantity).toBe(1);
    expect(parsed.lines[0]?.rawName).toBe("Sol Ring");
  });

  it("ignores blank lines", () => {
    const parsed = parseDeckList("\n\n1 Sol Ring\n\n");

    expect(parsed.lines).toHaveLength(1);
  });

  it("ignores hash comment lines", () => {
    const parsed = parseDeckList("# comment\n1 Sol Ring");

    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0]?.rawName).toBe("Sol Ring");
  });

  it("ignores slash comment lines", () => {
    const parsed = parseDeckList("// comment\n1 Sol Ring");

    expect(parsed.lines).toHaveLength(1);
  });

  it("removes inline hash comments", () => {
    const parsed = parseDeckList("1 Sol Ring # fast mana");

    expect(parsed.lines[0]?.rawName).toBe("Sol Ring");
  });

  it("does not treat split-card slashes as comments", () => {
    const parsed = parseDeckList("1 Fire // Ice");

    expect(parsed.lines[0]?.rawName).toBe("Fire // Ice");
  });

  it("recognizes Commander section headers", () => {
    const parsed = parseDeckList("Commander\n1 Atraxa, Praetors' Voice");

    expect(parsed.lines[0]?.section).toBe("commander");
    expect(parsed.sectionCounts.commander).toBe(1);
  });

  it("recognizes bracket section headers", () => {
    const parsed = parseDeckList("[Commander]\n1 Test Commander\n[Deck]\n1 Sol Ring");

    expect(parsed.lines[0]?.section).toBe("commander");
    expect(parsed.lines[1]?.section).toBe("mainboard");
  });

  it("recognizes colon section headers", () => {
    const parsed = parseDeckList("Commander:\n1 Test Commander\nCreatures:\n1 Llanowar Elves");

    expect(parsed.lines[0]?.section).toBe("commander");
    expect(parsed.lines[1]?.section).toBe("mainboard");
  });

  it("maps category sections to mainboard", () => {
    const parsed = parseDeckList("Artifacts\n1 Sol Ring\nLands\n1 Forest");

    expect(parsed.lines.map((line) => line.section)).toEqual(["mainboard", "mainboard"]);
  });

  it("tracks sideboard cards separately", () => {
    const parsed = parseDeckList("Sideboard\n1 Sol Ring");

    expect(parsed.lines[0]?.section).toBe("sideboard");
    expect(parsed.sectionCounts.sideboard).toBe(1);
  });

  it("tracks maybeboard cards separately", () => {
    const parsed = parseDeckList("Maybeboard\n1 Sol Ring");

    expect(parsed.lines[0]?.section).toBe("maybeboard");
    expect(parsed.sectionCounts.maybeboard).toBe(1);
  });

  it("reports unknown bracket sections", () => {
    const parsed = parseDeckList("[Custom]\n1 Sol Ring");

    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]).toMatchObject({
      code: "unknown_section",
      severity: "warning",
      lineNumber: 1,
    });
    expect(parsed.lines[0]?.section).toBe("unknown");
  });

  it("reports unknown colon sections", () => {
    const parsed = parseDeckList("Custom:\n1 Sol Ring");

    expect(parsed.issues[0]?.code).toBe("unknown_section");
    expect(parsed.lines[0]?.section).toBe("unknown");
  });

  it("keeps source metadata", () => {
    const parsed = parseDeckList("1 Sol Ring", {
      sourceType: "moxfield",
      sourceUrl: "https://example.com/decks/abc",
    });

    expect(parsed.input.sourceType).toBe("moxfield");
    expect(parsed.input.sourceUrl).toBe("https://example.com/decks/abc");
  });

  it("uses a custom default section", () => {
    const parsed = parseDeckList("1 Sol Ring", { defaultSection: "maybeboard" });

    expect(parsed.lines[0]?.section).toBe("maybeboard");
    expect(parsed.sectionCounts.maybeboard).toBe(1);
  });

  it("cleans set code and collector number", () => {
    expect(cleanCardName("Sol Ring (CMM) 400")).toBe("Sol Ring");
  });

  it("cleans Arena-style set code and collector number from real commander lines", () => {
    const parsed = parseDeckList(
      [
        "1 Jeska, Thrice Reborn (SLD) 1201",
        "1 Tymna the Weaver (PRM) 86180",
        "1 Ad Nauseam (SOA) 90",
        "1 Angel's Grace (SOA) 2",
        "1 Animate Dead (SOC) 207",
      ].join("\n"),
    );

    expect(parsed.lines.map((line) => line.rawName)).toEqual([
      "Jeska, Thrice Reborn",
      "Tymna the Weaver",
      "Ad Nauseam",
      "Angel's Grace",
      "Animate Dead",
    ]);
  });

  it("cleans set code and collector number before foil markers", () => {
    expect(cleanCardName("Sol Ring (CMM) 400 *F*")).toBe("Sol Ring");
  });

  it("cleans hash collector numbers after set codes", () => {
    expect(cleanCardName("Sol Ring (CMM) #400")).toBe("Sol Ring");
  });

  it("cleans trailing square-bracket set codes", () => {
    expect(cleanCardName("Sol Ring [CMM:400]")).toBe("Sol Ring");
  });

  it("cleans square-bracket set code and collector number", () => {
    expect(cleanCardName("Sol Ring [CMM] 400")).toBe("Sol Ring");
  });

  it("cleans leading square-bracket set codes", () => {
    expect(cleanCardName("[CMM:400] Sol Ring")).toBe("Sol Ring");
  });

  it("cleans leading parenthesized set codes", () => {
    expect(cleanCardName("(CMM) 400 Sol Ring")).toBe("Sol Ring");
  });

  it("recognizes comment-style Moxfield sections", () => {
    const parsed = parseDeckList(["// COMMANDER", "1 Test Commander", "// DECK", "1 Sol Ring"].join("\n"));

    expect(parsed.lines[0]?.section).toBe("commander");
    expect(parsed.lines[1]?.section).toBe("mainboard");
  });

  it("cleans foil-style markers", () => {
    expect(cleanCardName("Sol Ring *F*")).toBe("Sol Ring");
  });

  it("normalizes whitespace and case", () => {
    expect(normalizeCardName("  Sol    Ring  ")).toBe("sol ring");
  });

  it("preserves apostrophes in card names", () => {
    const parsed = parseDeckList("1 Atraxa, Praetors' Voice");

    expect(parsed.lines[0]?.rawName).toBe("Atraxa, Praetors' Voice");
  });

  it("preserves comma names", () => {
    const parsed = parseDeckList("1 Niv-Mizzet, Parun");

    expect(parsed.lines[0]?.normalizedName).toBe("niv-mizzet, parun");
  });

  it("reports zero quantity", () => {
    const parsed = parseDeckList("0 Sol Ring");

    expect(parsed.lines).toHaveLength(0);
    expect(parsed.issues[0]).toMatchObject({
      code: "invalid_quantity",
      severity: "error",
    });
  });

  it("counts quantities across sections", () => {
    const parsed = parseDeckList("Commander\n1 Test Commander\nDeck\n3 Forest\nMaybeboard\n2 Sol Ring");

    expect(parsed.sectionCounts.commander).toBe(1);
    expect(parsed.sectionCounts.mainboard).toBe(3);
    expect(parsed.sectionCounts.maybeboard).toBe(2);
    expect(parsed.totalQuantity).toBe(6);
  });

  it("handles Windows line endings", () => {
    const parsed = parseDeckList("Commander\r\n1 Test Commander\r\nDeck\r\n1 Sol Ring");

    expect(parsed.lines).toHaveLength(2);
    expect(parsed.sectionCounts.commander).toBe(1);
    expect(parsed.sectionCounts.mainboard).toBe(1);
  });
});

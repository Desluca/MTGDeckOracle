import { describe, expect, it } from "vitest";

import { parseAnalyzeDeckCliOptions } from "../../src/cli/cliOptions.js";

describe("parseAnalyzeDeckCliOptions", () => {
  it("defaults to json", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
      offline: false,
    });
  });

  it("parses spaced format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format", "markdown"])).toEqual({
      deckFilePath: "deck.txt",
      format: "markdown",
      cardRatings: "auto",
      offline: false,
    });
  });

  it("parses inline format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format=html"])).toEqual({
      deckFilePath: "deck.txt",
      format: "html",
      cardRatings: "auto",
      offline: false,
    });
  });

  it("throws for invalid formats", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--format", "xml"])).toThrow("Invalid format");
  });

  it("returns only format when deck path is missing", () => {
    expect(parseAnalyzeDeckCliOptions(["--format", "html"])).toEqual({
      format: "html",
      cardRatings: "auto",
      offline: false,
    });
  });

  it("parses card ratings mode", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings", "off"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "off",
      offline: false,
    });
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings=auto"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
      offline: false,
    });
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--no-card-ratings"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "off",
      offline: false,
    });
  });

  it("throws for invalid card ratings mode", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings", "always"])).toThrow("Invalid card ratings mode");
  });

  it("parses offline mode", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--offline"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
      offline: true,
    });
  });

  it("parses score notes", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--notes", "Core solido del playgroup"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
      offline: false,
      scoreNotes: "Core solido del playgroup",
    });
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--score-notes=Calibrazione Kinnan"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
      offline: false,
      scoreNotes: "Calibrazione Kinnan",
    });
  });

  it("throws when notes are missing", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--notes"])).toThrow("Missing score notes");
  });
});

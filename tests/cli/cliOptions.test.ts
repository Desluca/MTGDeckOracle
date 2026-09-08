import { describe, expect, it } from "vitest";

import { parseAnalyzeDeckCliOptions } from "../../src/cli/cliOptions.js";

describe("parseAnalyzeDeckCliOptions", () => {
  it("defaults to json", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
    });
  });

  it("parses spaced format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format", "markdown"])).toEqual({
      deckFilePath: "deck.txt",
      format: "markdown",
      cardRatings: "auto",
    });
  });

  it("parses inline format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format=html"])).toEqual({
      deckFilePath: "deck.txt",
      format: "html",
      cardRatings: "auto",
    });
  });

  it("throws for invalid formats", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--format", "xml"])).toThrow("Invalid format");
  });

  it("returns only format when deck path is missing", () => {
    expect(parseAnalyzeDeckCliOptions(["--format", "html"])).toEqual({
      format: "html",
      cardRatings: "auto",
    });
  });

  it("parses card ratings mode", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings", "off"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "off",
    });
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings=auto"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "auto",
    });
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--no-card-ratings"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
      cardRatings: "off",
    });
  });

  it("throws for invalid card ratings mode", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--card-ratings", "always"])).toThrow("Invalid card ratings mode");
  });
});

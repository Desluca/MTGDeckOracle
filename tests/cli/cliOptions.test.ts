import { describe, expect, it } from "vitest";

import { parseAnalyzeDeckCliOptions } from "../../src/cli/cliOptions.js";

describe("parseAnalyzeDeckCliOptions", () => {
  it("defaults to json", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt"])).toEqual({
      deckFilePath: "deck.txt",
      format: "json",
    });
  });

  it("parses spaced format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format", "markdown"])).toEqual({
      deckFilePath: "deck.txt",
      format: "markdown",
    });
  });

  it("parses inline format option", () => {
    expect(parseAnalyzeDeckCliOptions(["deck.txt", "--format=html"])).toEqual({
      deckFilePath: "deck.txt",
      format: "html",
    });
  });

  it("throws for invalid formats", () => {
    expect(() => parseAnalyzeDeckCliOptions(["deck.txt", "--format", "xml"])).toThrow("Invalid format");
  });

  it("returns only format when deck path is missing", () => {
    expect(parseAnalyzeDeckCliOptions(["--format", "html"])).toEqual({
      format: "html",
    });
  });
});

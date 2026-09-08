import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { uniqueNormalizedNames } from "../../../src/card-data/index.js";
import { parseDeckList } from "../../../src/parser/index.js";
import { createCardMap } from "../../utils/cardFactory.js";
import { stapleCards } from "./stapleCards.js";

describe("stapleCards", () => {
  it("covers every card name used by the real deck fixtures", () => {
    const cardMap = createCardMap(stapleCards);
    const names = new Set<string>();
    const realDecksPath = join(process.cwd(), "tests", "fixtures", "decks", "real");

    for (const fileName of readdirSync(realDecksPath).filter((name) => name.endsWith(".deck"))) {
      const parsed = parseDeckList(readFileSync(join(realDecksPath, fileName), "utf8"));
      for (const name of uniqueNormalizedNames(parsed.lines.map((line) => line.normalizedName))) {
        names.add(name);
      }
    }

    const missing = [...names].filter((name) => !cardMap.has(name)).sort();
    expect(missing).toEqual([]);
  });
});

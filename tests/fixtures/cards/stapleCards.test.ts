import { describe, expect, it } from "vitest";

import { uniqueNormalizedNames } from "../../../src/card-data/index.js";
import { parseDeckList } from "../../../src/parser/index.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCardMap } from "../../utils/cardFactory.js";
import { stapleCards } from "./stapleCards.js";

describe("stapleCards", () => {
  it("covers every card name used by the real deck fixtures", () => {
    const cardMap = createCardMap(stapleCards);
    const names = new Set<string>();

    for (const fileName of [
      "pantlaza-precon.deck",
      "muldrotha-casual.deck",
      "kinnan-high-power.deck",
      "thrasios-tymna-cedh.deck",
      "gishath-bad-mana.deck",
      "whtz-120.deck",
      "kinnan-illegal-size.deck",
      "pantlaza-illegal-color.deck",
    ]) {
      const parsed = parseDeckList(readFileSync(join(process.cwd(), "tests", "fixtures", "decks", "real", fileName), "utf8"));
      for (const name of uniqueNormalizedNames(parsed.lines.map((line) => line.normalizedName))) {
        names.add(name);
      }
    }

    const missing = [...names].filter((name) => !cardMap.has(name)).sort();
    expect(missing).toEqual([]);
  });
});

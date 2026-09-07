import { describe, expect, it, vi } from "vitest";

import { CommanderSpellbookComboDataProvider, mapCommanderSpellbookVariant } from "../../src/combo/index.js";
import type { CommanderSpellbookVariant } from "../../src/combo/index.js";

describe("CommanderSpellbookComboDataProvider", () => {
  it("fetches variants for card names", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        results: [createVariant()],
      }),
    );
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn });

    const combos = await provider.findCombosForCards(["Isochron Scepter"]);

    expect(combos).toHaveLength(1);
    expect(combos[0]?.source).toBe("commander_spellbook");
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/variants/" }));
  });

  it("deduplicates combos returned for multiple cards", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        results: [createVariant({ id: "same-combo" })],
      }),
    );
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn });

    const combos = await provider.findCombosForCards(["Isochron Scepter", "Dramatic Reversal"]);

    expect(combos).toHaveLength(1);
  });

  it("throws when Commander Spellbook responds with an error", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 503, statusText: "Unavailable" }));
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn });

    await expect(provider.findCombosForCards(["Isochron Scepter"])).rejects.toThrow("Commander Spellbook request failed");
  });
});

describe("mapCommanderSpellbookVariant", () => {
  it("maps variant cards and outputs", () => {
    const combo = mapCommanderSpellbookVariant(createVariant());

    expect(combo.id).toBe("combo-1");
    expect(combo.name).toBe("Isochron Scepter + Dramatic Reversal");
    expect(combo.pieces).toEqual([
      { cardName: "Isochron Scepter", required: true },
      { cardName: "Dramatic Reversal", required: true },
    ]);
    expect(combo.outcomes).toEqual(expect.arrayContaining(["infinite_mana", "infinite_damage"]));
    expect(combo.estimatedClosingTurnMana).toBe(2);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createVariant(overrides: Partial<CommanderSpellbookVariant> = {}): CommanderSpellbookVariant {
  return {
    id: "combo-1",
    uses: [
      { card: { name: "Isochron Scepter" } },
      { card: { name: "Dramatic Reversal" } },
    ],
    produces: [
      { feature: { name: "Infinite mana" } },
      { feature: { name: "Infinite damage" } },
    ],
    manaValueNeeded: 2,
    description: "Repeat the loop.",
    ...overrides,
  };
}

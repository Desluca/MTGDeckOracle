import type { KnownCombo } from "../../../src/domain/index.js";

export const fixtureCombos: readonly KnownCombo[] = [
  {
    id: "isochron-dramatic",
    name: "Isochron Scepter + Dramatic Reversal",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Isochron Scepter", required: true },
      { cardName: "Dramatic Reversal", required: true },
    ],
    outcomes: ["infinite_mana"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 3,
    description: "Untap rocks with the imprinted reversal to make infinite mana.",
  },
  {
    id: "isochron-dramatic-ballista",
    name: "Isochron Scepter + Dramatic Reversal + Walking Ballista",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Isochron Scepter", required: true },
      { cardName: "Dramatic Reversal", required: true },
      { cardName: "Walking Ballista", required: true },
    ],
    outcomes: ["wins_game", "infinite_damage"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 4,
    description: "Infinite mana plus Ballista removes the table.",
  },
];

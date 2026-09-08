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
  {
    id: "thoracle-consult",
    name: "Thassa's Oracle + Demonic Consultation",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Thassa's Oracle", required: true },
      { cardName: "Demonic Consultation", required: true },
    ],
    outcomes: ["wins_game"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 3,
    description: "Exile the library and win with Oracle's devotion check.",
  },
  {
    id: "thoracle-tainted-pact",
    name: "Thassa's Oracle + Tainted Pact",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Thassa's Oracle", required: true },
      { cardName: "Tainted Pact", required: true },
    ],
    outcomes: ["wins_game"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 4,
    description: "Empty the library with Tainted Pact, then win with Oracle.",
  },
];

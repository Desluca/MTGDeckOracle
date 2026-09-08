import type { DeckCard, FunctionalTag } from "../domain/index.js";

export type CommanderTheme =
  | "graveyard"
  | "artifacts"
  | "tokens"
  | "spellslinger"
  | "lifegain"
  | "aristocrats"
  | "counters"
  | "enchantments"
  | "equipment"
  | "tribal";

interface CommanderThemeRule {
  readonly theme: CommanderTheme;
  readonly targetId: string;
  readonly commanderTags: readonly FunctionalTag[];
  readonly oracleHints: readonly string[];
}

const THEME_RULES: readonly CommanderThemeRule[] = [
  {
    theme: "graveyard",
    targetId: "graveyard",
    commanderTags: ["graveyard_synergy", "recursion"],
    oracleHints: ["graveyard"],
  },
  {
    theme: "artifacts",
    targetId: "artifacts",
    commanderTags: ["artifact_synergy"],
    oracleHints: ["artifacts you control", "artifact you control", "cast an artifact"],
  },
  {
    theme: "tokens",
    targetId: "tokens",
    commanderTags: ["token_synergy"],
    oracleHints: ["token"],
  },
  {
    theme: "spellslinger",
    targetId: "spellslinger",
    commanderTags: ["spellslinger"],
    oracleHints: ["instant or sorcery", "instants and sorceries", "magecraft", "prowess"],
  },
  {
    theme: "lifegain",
    targetId: "lifegain",
    commanderTags: ["lifegain"],
    oracleHints: ["you gain", "life you gained", "lifelink"],
  },
  {
    theme: "aristocrats",
    targetId: "aristocrats",
    commanderTags: ["aristocrats"],
    oracleHints: ["sacrifice a creature", "whenever a creature you control dies", "whenever you sacrifice"],
  },
  {
    theme: "counters",
    targetId: "counters",
    commanderTags: ["counters_synergy"],
    oracleHints: ["+1/+1 counter", "proliferate"],
  },
  {
    theme: "enchantments",
    targetId: "enchantments",
    commanderTags: ["enchantment_synergy"],
    oracleHints: ["enchantments you control", "enchantment you control", "constellation"],
  },
  {
    theme: "equipment",
    targetId: "equipment",
    commanderTags: ["equipment_synergy"],
    oracleHints: ["equipped creature", "equipment you control", "attach"],
  },
  {
    theme: "tribal",
    targetId: "tribal",
    commanderTags: ["tribal_synergy"],
    oracleHints: [],
  },
];

export function inferCommanderThemes(deckCards: readonly DeckCard[]): readonly CommanderTheme[] {
  const commanders = deckCards.filter((deckCard) => deckCard.section === "commander");
  const themes = new Set<CommanderTheme>();

  for (const commander of commanders) {
    const oracleText = commander.card.rules.oracleText.toLowerCase();
    const tags = commander.card.evaluation.functionalTags;

    for (const rule of THEME_RULES) {
      if (rule.commanderTags.some((tag) => tags.includes(tag)) || rule.oracleHints.some((hint) => oracleText.includes(hint))) {
        themes.add(rule.theme);
      }
    }

    if (commanderMentionsOwnCreatureType(commander)) {
      themes.add("tribal");
    }
  }

  return [...themes];
}

export function commanderThemeMultiplier(targetId: string, themes: readonly CommanderTheme[]): number {
  return THEME_RULES.some((rule) => rule.targetId === targetId && themes.includes(rule.theme)) ? 2 : 1;
}

function commanderMentionsOwnCreatureType(commander: DeckCard): boolean {
  const oracleText = commander.card.rules.oracleText.toLowerCase();
  return commander.card.rules.subtypes.some((subtype) => mentionsCreatureType(oracleText, subtype));
}

export function mentionsCreatureType(text: string, subtype: string): boolean {
  const lower = subtype.toLowerCase();
  const plural = lower.endsWith("f") ? `${lower.slice(0, -1)}ves` : `${lower}s`;
  return text.includes(lower) || text.includes(plural);
}

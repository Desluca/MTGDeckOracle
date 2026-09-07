import type { ComboOutcome, KnownCombo } from "../domain/index.js";
import { normalizeLookupName, uniqueNormalizedNames } from "../card-data/index.js";
import type { ComboDataProvider } from "./comboDataSource.js";
import type { CommanderSpellbookVariant, CommanderSpellbookVariantResponse } from "./commanderSpellbookTypes.js";

export interface CommanderSpellbookComboDataProviderOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly limitPerCard?: number;
}

const DEFAULT_API_BASE_URL = "https://backend.commanderspellbook.com";
const DEFAULT_LIMIT_PER_CARD = 50;

export class CommanderSpellbookComboDataProvider implements ComboDataProvider {
  private readonly apiBaseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly limitPerCard: number;

  constructor(options: CommanderSpellbookComboDataProviderOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.limitPerCard = options.limitPerCard ?? DEFAULT_LIMIT_PER_CARD;
  }

  async findCombosForCards(normalizedCardNames: readonly string[]): Promise<readonly KnownCombo[]> {
    const combosById = new Map<string, KnownCombo>();

    for (const cardName of uniqueNormalizedNames(normalizedCardNames)) {
      const variants = await this.fetchVariantsForCard(cardName);

      for (const variant of variants) {
        const combo = mapCommanderSpellbookVariant(variant);
        if (combo.pieces.length > 0) {
          combosById.set(combo.id, combo);
        }
      }
    }

    return [...combosById.values()];
  }

  private async fetchVariantsForCard(normalizedCardName: string): Promise<readonly CommanderSpellbookVariant[]> {
    const query = `card="${normalizedCardName}"`;
    const url = new URL("/variants/", this.apiBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(this.limitPerCard));

    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new Error(`Commander Spellbook request failed with ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as CommanderSpellbookVariantResponse;
    return body.data ?? body.results ?? [];
  }
}

export function mapCommanderSpellbookVariant(variant: CommanderSpellbookVariant): KnownCombo {
  const pieces = (variant.uses ?? [])
    .map((use) => use.card?.name)
    .filter((name): name is string => Boolean(name))
    .map((cardName) => ({
      cardName,
      required: true,
    }));
  const outcomes = mapOutcomes(variant.produces ?? []);

  return {
    id: variant.id,
    name: pieces.map((piece) => piece.cardName).join(" + ") || `Commander Spellbook ${variant.id}`,
    source: "commander_spellbook",
    sourceUrl: `https://commanderspellbook.com/combo/${variant.id}`,
    pieces,
    outcomes: outcomes.length > 0 ? outcomes : ["value_engine"],
    ...(variant.manaValueNeeded !== undefined ? { estimatedClosingTurnMana: variant.manaValueNeeded } : {}),
    description: [variant.description, variant.notes].filter(Boolean).join("\n\n"),
  };
}

function mapOutcomes(produces: readonly { readonly feature?: { readonly name?: string } }[]): readonly ComboOutcome[] {
  const outcomes = new Set<ComboOutcome>();

  for (const produce of produces) {
    const featureName = normalizeLookupName(produce.feature?.name ?? "");

    if (featureName.includes("win") || featureName.includes("lose the game")) {
      outcomes.add("wins_game");
    } else if (featureName.includes("mana")) {
      outcomes.add("infinite_mana");
    } else if (featureName.includes("damage") || featureName.includes("damage triggers")) {
      outcomes.add("infinite_damage");
    } else if (featureName.includes("draw")) {
      outcomes.add("infinite_draw");
    } else if (featureName.includes("token")) {
      outcomes.add("infinite_tokens");
    } else if (featureName.includes("mill")) {
      outcomes.add("infinite_mill");
    } else if (featureName.includes("life")) {
      outcomes.add("infinite_life");
    } else if (featureName.includes("lock")) {
      outcomes.add("lock");
    } else {
      outcomes.add("value_engine");
    }
  }

  return [...outcomes];
}

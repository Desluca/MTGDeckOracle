import type { ComboOutcome, KnownCombo } from "../domain/index.js";
import { normalizeLookupName, uniqueNormalizedNames } from "../card-data/index.js";
import type { ComboDataProvider } from "./comboDataSource.js";
import type { CommanderSpellbookVariant, CommanderSpellbookVariantResponse } from "./commanderSpellbookTypes.js";

export interface CommanderSpellbookComboDataProviderOptions {
  readonly apiBaseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly limitPerCard?: number;
}

export interface CommanderSpellbookCatalogOptions {
  readonly pageSize?: number;
  readonly maxPages?: number;
  readonly delayMs?: number;
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

  async findAllCombos(options: CommanderSpellbookCatalogOptions = {}): Promise<readonly KnownCombo[]> {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;
    const delayMs = options.delayMs ?? 0;
    const combosById = new Map<string, KnownCombo>();
    let offset = 0;
    let nextUrl: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      if (page > 0 && delayMs > 0) {
        await sleep(delayMs);
      }

      const url = nextUrl ? new URL(nextUrl) : this.createVariantsUrl({ limit: pageSize, offset });
      const body = await this.fetchVariants(url);
      const variants = body.results ?? body.data ?? [];

      for (const variant of variants) {
        const combo = mapCommanderSpellbookVariant(variant);
        if (combo.pieces.length > 0) {
          combosById.set(combo.id, combo);
        }
      }

      if (variants.length === 0) {
        break;
      }

      if (typeof body.next === "string" && body.next.length > 0) {
        nextUrl = body.next;
        continue;
      }

      if ("next" in body || variants.length < pageSize) {
        break;
      }

      offset += pageSize;
      nextUrl = undefined;
    }

    return [...combosById.values()];
  }

  private async fetchVariantsForCard(normalizedCardName: string): Promise<readonly CommanderSpellbookVariant[]> {
    const url = this.createVariantsUrl({
      q: `card="${normalizedCardName}"`,
      limit: this.limitPerCard,
    });
    const body = await this.fetchVariants(url);
    return body.data ?? body.results ?? [];
  }

  private createVariantsUrl(params: { readonly q?: string; readonly limit: number; readonly offset?: number }): URL {
    const url = new URL("/variants/", this.apiBaseUrl);
    if (params.q) {
      url.searchParams.set("q", params.q);
    }
    url.searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }
    return url;
  }

  private async fetchVariants(url: URL): Promise<CommanderSpellbookVariantResponse> {
    const response = await this.fetchFn(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MTGDeckOracle/0.1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Commander Spellbook request failed with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as CommanderSpellbookVariantResponse;
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
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

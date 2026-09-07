export interface CommanderSpellbookVariantResponse {
  readonly data?: readonly CommanderSpellbookVariant[];
  readonly results?: readonly CommanderSpellbookVariant[];
}

export interface CommanderSpellbookVariant {
  readonly id: string;
  readonly uses?: readonly CommanderSpellbookUse[];
  readonly produces?: readonly CommanderSpellbookProduce[];
  readonly manaValueNeeded?: number;
  readonly description?: string;
  readonly notes?: string;
}

export interface CommanderSpellbookUse {
  readonly card?: {
    readonly name?: string;
  };
}

export interface CommanderSpellbookProduce {
  readonly feature?: {
    readonly name?: string;
  };
}

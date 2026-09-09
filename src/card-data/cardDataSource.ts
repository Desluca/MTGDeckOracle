import type { Card } from "../domain/index.js";

export interface CardDataSource {
  findCardByName(cardName: string): Promise<Card | undefined>;
  findCardsByNames(cardNames: readonly string[]): Promise<ReadonlyMap<string, Card>>;
}

export interface CardCache {
  get(normalizedName: string): Promise<Card | undefined>;
  set(normalizedName: string, card: Card): Promise<void>;
  getMany(normalizedNames: readonly string[]): Promise<ReadonlyMap<string, Card>>;
  setMany(cardsByNormalizedName: ReadonlyMap<string, Card>): Promise<void>;
}

export function uniqueNormalizedNames(cardNames: readonly string[]): readonly string[] {
  return [...new Set(cardNames.map((name) => normalizeLookupName(name)).filter((name) => name.length > 0))];
}

export function normalizeLookupName(cardName: string): string {
  const collapsed = cardName.trim().toLowerCase().replace(/\s+/g, " ");
  const faces = collapsed
    .split(/\s*\/\/\s*|\s+\/\s*|\/+/)
    .map((face) => face.trim())
    .filter((face) => face.length > 0);

  return faces.join(" // ");
}

export function cardLookupKeys(card: Card): readonly string[] {
  const officialName = normalizeLookupName(card.identity.name);
  const faces = officialName
    .split(" // ")
    .map((face) => face.trim())
    .filter((face) => face.length > 0);

  return [...new Set([officialName, ...faces])];
}

export function findCardByLookupName(cardsByName: ReadonlyMap<string, Card>, cardName: string): Card | undefined {
  const normalizedName = normalizeLookupName(cardName);
  const direct = cardsByName.get(normalizedName);

  if (direct) {
    return direct;
  }

  for (const card of cardsByName.values()) {
    if (cardLookupKeys(card).includes(normalizedName)) {
      return card;
    }
  }

  return undefined;
}

export function expandCardLookupMap(cardsByName: ReadonlyMap<string, Card>): Map<string, Card> {
  const expanded = new Map(cardsByName);

  for (const card of cardsByName.values()) {
    for (const key of cardLookupKeys(card)) {
      expanded.set(key, card);
    }
  }

  return expanded;
}

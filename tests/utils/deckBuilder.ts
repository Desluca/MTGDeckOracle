export interface GeneratedDeckOptions {
  readonly commanderCount?: number;
  readonly mainboardCount?: number;
  readonly namePrefix?: string;
}

export function generateCommanderDeck(options: GeneratedDeckOptions = {}): string {
  const commanderCount = options.commanderCount ?? 1;
  const mainboardCount = options.mainboardCount ?? 99;
  const namePrefix = options.namePrefix ?? "Test Card";
  const lines: string[] = ["Commander"];

  for (let index = 1; index <= commanderCount; index += 1) {
    lines.push(`1 Test Commander ${index}`);
  }

  lines.push("", "Deck");

  for (let index = 1; index <= mainboardCount; index += 1) {
    lines.push(`1 ${namePrefix} ${index}`);
  }

  return lines.join("\n");
}

export function generateDeckWithBasicLands(basicLandCount: number): string {
  return [
    "Commander",
    "1 Test Commander",
    "",
    "Deck",
    `${basicLandCount} Forest`,
    ...Array.from({ length: 99 - basicLandCount }, (_, index) => `1 Test Spell ${index + 1}`),
  ].join("\n");
}

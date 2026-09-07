export function hypergeometricAtLeastOne(populationSize: number, successCount: number, drawCount: number): number {
  if (populationSize <= 0 || successCount <= 0 || drawCount <= 0) {
    return 0;
  }

  if (successCount >= populationSize || drawCount >= populationSize) {
    return 1;
  }

  const misses = populationSize - successCount;
  if (drawCount > misses) {
    return 1;
  }

  return clampProbability(1 - combinationsRatio(misses, populationSize, drawCount));
}

export function consistencyMultiplier(deckSize: number, baselineSize = 100, exponent = 1.4): number {
  if (deckSize <= 0 || baselineSize <= 0) {
    return 0;
  }

  if (deckSize <= baselineSize) {
    return 1;
  }

  return Math.pow(baselineSize / deckSize, exponent);
}

function combinationsRatio(successesInMissPool: number, populationSize: number, drawCount: number): number {
  let ratio = 1;

  for (let index = 0; index < drawCount; index += 1) {
    ratio *= (successesInMissPool - index) / (populationSize - index);
  }

  return ratio;
}

function clampProbability(probability: number): number {
  return Math.max(0, Math.min(1, probability));
}

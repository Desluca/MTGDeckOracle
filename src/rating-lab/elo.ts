export interface EloUpdate {
  readonly winnerRating: number;
  readonly loserRating: number;
}

const DEFAULT_K_FACTOR = 32;

export function updateEloRatings(winnerRating: number, loserRating: number, kFactor = DEFAULT_K_FACTOR): EloUpdate {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  return {
    winnerRating: Math.round(winnerRating + kFactor * (1 - expectedWinner)),
    loserRating: Math.round(loserRating + kFactor * (0 - expectedLoser)),
  };
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

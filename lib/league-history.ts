/** Palmarès des éditions jouées hors de l'app (Excel), par code de ligue. */
export type JerseyTable = [string, number][];
export const LEAGUE_HISTORY: Record<string, { season: number; jaune: JerseyTable; arc: JerseyTable; bleu: JerseyTable }[]> = {
  // Garet Sporting Club
  BLEK: [
    {
      season: 2025,
      jaune: [["Pierre", 27], ["Paul", 21], ["François", 21], ["Corentin", 19], ["Laurent", 17]],
      arc: [["Corentin", 13], ["François", 10], ["Paul", 10], ["Pierre", 9], ["Laurent", 8]],
      bleu: [["Pierre", 18], ["Paul", 11], ["François", 11], ["Laurent", 9], ["Corentin", 6]],
    },
  ],
};

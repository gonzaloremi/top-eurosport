import type { Category } from "./season";

/** "Dembélé " / "dembele" / "Mc Intosh" / "McIntosh" -> même clé. */
export function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export type Top10 = string[]; // index 0 = 1er
export type PickScore = { position: number; athlete: string; points: 0 | 1 | 3 };

/**
 * Règle du jeu :
 *  - 3 pts : bon athlète à la bonne place
 *  - 1 pt  : athlète présent dans le top 10 officiel, mais mal placé
 *  - 0 pt  : athlète absent du top 10
 */
export function scoreCategory(
  picks: Top10,
  official: Top10,
  aliases: Map<string, string> = new Map(),
  keyOf: (n: string) => string = normalize
): { total: number; exact: number; details: PickScore[] } {
  const key = (n: string) => {
    const k = keyOf(n);
    return aliases.get(k) ?? k;
  };
  const officialKeys = official.map((a) => (a ? key(a) : ""));
  const officialSet = new Set(officialKeys.filter(Boolean));
  const seen = new Set<string>();
  let total = 0;
  let exact = 0;
  const details: PickScore[] = picks.map((athlete, i) => {
    if (!athlete || officialSet.size === 0) return { position: i + 1, athlete, points: 0 };
    const k = key(athlete);
    if (seen.has(k)) return { position: i + 1, athlete, points: 0 }; // doublon (après fusion)
    seen.add(k);
    let points: 0 | 1 | 3 = 0;
    if (officialKeys[i] && officialKeys[i] === k) {
      points = 3;
      exact++;
    } else if (officialSet.has(k)) points = 1;
    total += points;
    return { position: i + 1, athlete, points };
  });
  return { total, exact, details };
}

export type Standing = {
  userId: number;
  name: string;
  submitted: boolean;
  monde: number;
  france: number;
  total: number;
  exact: number;
};

export function rankBy<T>(rows: T[], score: (r: T) => number, tiebreak: (r: T) => number) {
  const sorted = [...rows].sort((a, b) => score(b) - score(a) || tiebreak(b) - tiebreak(a));
  let lastRank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    const rank =
      i > 0 && score(prev) === score(r) && tiebreak(prev) === tiebreak(r) ? lastRank : i + 1;
    lastRank = rank;
    return { rank, row: r };
  });
}

export type { Category };

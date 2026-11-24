import "server-only";
import { sql, ensureSchema } from "./db";
import { CATEGORIES, type Category } from "./season";
import { normalize, scoreCategory, type Standing } from "./scoring";

export type Top10Pair = Record<Category, string[]>;

function empty(): Top10Pair {
  return { monde: Array(10).fill(""), france: Array(10).fill("") };
}

export async function getResults(season: number): Promise<Top10Pair> {
  await ensureSchema();
  const rows = await sql`SELECT category, position, athlete FROM results WHERE season = ${season}`;
  const r = empty();
  for (const row of rows) r[row.category as Category][row.position - 1] = row.athlete;
  return r;
}

export function hasResults(r: Top10Pair, cat?: Category) {
  const cats = cat ? [cat] : CATEGORIES;
  return cats.some((c) => r[c].some(Boolean));
}

export async function getAliases(season: number): Promise<Map<string, string>> {
  const rows = await sql`SELECT from_key, to_key FROM aliases WHERE season = ${season}`;
  return new Map(rows.map((r) => [r.from_key as string, r.to_key as string]));
}

export async function getPredictions(userIds: number[], season: number) {
  await ensureSchema();
  const map = new Map<number, Top10Pair>();
  if (userIds.length === 0) return map;
  const rows = await sql`
    SELECT user_id, category, position, athlete FROM predictions
    WHERE season = ${season} AND user_id = ANY(${userIds})`;
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, empty());
    map.get(row.user_id)![row.category as Category][row.position - 1] = row.athlete;
  }
  return map;
}

export async function getMyLeagues(userId: number) {
  await ensureSchema();
  return sql<{ id: number; name: string; code: string; members: number; owner_id: number }[]>`
    SELECT l.id, l.name, l.code, l.owner_id,
           (SELECT count(*)::int FROM league_members m2 WHERE m2.league_id = l.id) AS members
    FROM leagues l JOIN league_members m ON m.league_id = l.id
    WHERE m.user_id = ${userId}
    ORDER BY l.created_at`;
}

export async function getLeague(code: string) {
  await ensureSchema();
  const [league] = await sql<{ id: number; name: string; code: string; owner_id: number }[]>`
    SELECT id, name, code, owner_id FROM leagues WHERE code = ${code.toUpperCase()}`;
  return league ?? null;
}

export async function getMembers(leagueId: number) {
  return sql<{ id: number; display_name: string }[]>`
    SELECT u.id, u.display_name FROM league_members m JOIN users u ON u.id = m.user_id
    WHERE m.league_id = ${leagueId} ORDER BY m.joined_at`;
}

export async function computeStandings(
  members: { id: number; display_name: string }[],
  season: number
) {
  const [results, aliases, preds] = await Promise.all([
    getResults(season),
    getAliases(season),
    getPredictions(
      members.map((m) => m.id),
      season
    ),
  ]);
  const details = new Map<number, Record<Category, ReturnType<typeof scoreCategory>>>();
  const standings: Standing[] = members.map((m) => {
    const p = preds.get(m.id) ?? empty();
    const monde = scoreCategory(p.monde, results.monde, aliases);
    const france = scoreCategory(p.france, results.france, aliases);
    details.set(m.id, { monde, france });
    return {
      userId: m.id,
      name: m.display_name,
      submitted: p.monde.some(Boolean) || p.france.some(Boolean),
      monde: monde.total,
      france: france.total,
      total: monde.total + france.total,
      exact: monde.exact + france.exact,
    };
  });
  return { standings, details, results, preds };
}

/** Tous les noms déjà saisis (pour l'autocomplétion). */
export async function getKnownAthletes(): Promise<string[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT athlete FROM results
    UNION SELECT athlete FROM predictions`;
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const k = normalize(r.athlete);
    if (k && !byKey.has(k)) byKey.set(k, r.athlete);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

import "server-only";
import { sql, ensureSchema } from "./db";
import { CATEGORIES, type Category } from "./season";
import { scoreCategory, type Standing } from "./scoring";
import { allAthletes, makeResolver, toLite, type Athlete } from "./athletes";
import { normalize } from "./search";

export type Slot = { id: number | null; name: string };
export type Slots = Record<Category, Slot[]>;

export function emptySlots(): Slots {
  const e = () => Array.from({ length: 10 }, () => ({ id: null, name: "" }));
  return { monde: e(), france: e() };
}

export async function getResults(season: number): Promise<Slots> {
  await ensureSchema();
  const rows = await sql`SELECT category, position, athlete, athlete_id FROM results WHERE season = ${season}`;
  const r = emptySlots();
  for (const row of rows) r[row.category as Category][row.position - 1] = { id: row.athlete_id, name: row.athlete };
  return r;
}

export function hasResults(r: Slots, cat?: Category) {
  const cats = cat ? [cat] : CATEGORIES;
  return cats.some((c) => r[c].some((s) => s.name));
}

export async function getPredictions(userIds: number[], season: number) {
  await ensureSchema();
  const map = new Map<number, Slots>();
  if (userIds.length === 0) return map;
  const rows = await sql`
    SELECT user_id, category, position, athlete, athlete_id FROM predictions
    WHERE season = ${season} AND user_id = ANY(${userIds})`;
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, emptySlots());
    map.get(row.user_id)![row.category as Category][row.position - 1] = { id: row.athlete_id, name: row.athlete };
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

/** Clé de comparaison : l'athlète du catalogue si connu, sinon le texte normalisé. */
function keyer(athletes: Athlete[]) {
  const resolve = makeResolver(athletes);
  return (s: Slot) => {
    if (!s.name && !s.id) return "";
    const id = s.id ?? resolve(s.name);
    return id ? `a${id}` : `t${normalize(s.name)}`;
  };
}

export async function computeStandings(members: { id: number; display_name: string }[], season: number) {
  const [results, preds, athletes] = await Promise.all([
    getResults(season),
    getPredictions(
      members.map((m) => m.id),
      season
    ),
    allAthletes(),
  ]);
  const key = keyer(athletes);
  const officialKeys = { monde: results.monde.map(key), france: results.france.map(key) };
  const details = new Map<number, Record<Category, ReturnType<typeof scoreCategory>>>();
  const standings: Standing[] = members.map((m) => {
    const p = preds.get(m.id) ?? emptySlots();
    const score = (c: Category) => {
      const keys = p[c].map(key);
      const res = scoreCategory(keys, officialKeys[c], new Map(), (k) => k);
      res.details.forEach((d, i) => (d.athlete = p[c][i].name));
      return res;
    };
    const monde = score("monde");
    const france = score("france");
    details.set(m.id, { monde, france });
    return {
      userId: m.id,
      name: m.display_name,
      submitted: p.monde.some((s) => s.name) || p.france.some((s) => s.name),
      monde: monde.total,
      france: france.total,
      total: monde.total + france.total,
      exact: monde.exact + france.exact,
    };
  });
  return { standings, details, results, preds };
}

export async function getCatalogLite() {
  await ensureSchema();
  return (await allAthletes()).map(toLite);
}

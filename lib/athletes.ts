import "server-only";
import { sql as defaultSql, type Db } from "./db";
import { distance, normalize, type Lite } from "./search";

export type Athlete = {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  search_key: string;
  last_key: string;
  sport: string;
  gender: string;
  country: string;
  in_intl: boolean;
  in_fr: boolean;
  note: string;
  status: "approved" | "pending";
  created_by: number | null;
};

export function displayName(first: string, last: string) {
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}

export async function allAthletes(sql: Db = defaultSql): Promise<Athlete[]> {
  return sql<Athlete[]>`SELECT * FROM athletes ORDER BY sport, last_name`;
}

export function toLite(a: Athlete): Lite {
  return {
    id: a.id,
    n: a.display_name,
    s: a.sport,
    g: a.gender,
    c: a.country.trim(),
    i: a.in_intl,
    f: a.in_fr,
    p: a.status === "pending",
    l: a.last_name,
  };
}

const sql = defaultSql;

export async function insertAthlete(input: {
  first_name: string;
  last_name: string;
  sport: string;
  gender: string;
  country: string;
  in_intl?: boolean;
  in_fr?: boolean;
  note?: string;
  status: "approved" | "pending";
  created_by?: number | null;
}): Promise<Athlete> {
  const display = displayName(input.first_name, input.last_name);
  const [row] = await sql<Athlete[]>`
    INSERT INTO athletes (first_name, last_name, display_name, search_key, last_key, sport, gender, country,
                          in_intl, in_fr, note, status, created_by)
    VALUES (${input.first_name.trim()}, ${input.last_name.trim()}, ${display}, ${normalize(display)},
            ${normalize(input.last_name)}, ${input.sport.trim()}, ${input.gender}, ${input.country.toUpperCase()},
            ${input.in_intl ?? false}, ${input.in_fr ?? false}, ${input.note ?? ""}, ${input.status},
            ${input.created_by ?? null})
    ON CONFLICT (search_key, sport) DO UPDATE SET search_key = EXCLUDED.search_key
    RETURNING *`;
  return row;
}

/** Résout un nom saisi en texte libre (anciens pronos) vers un athlète du catalogue, si c'est sans ambiguïté. */
export function makeResolver(athletes: Athlete[]) {
  const byFull = new Map<string, number[]>();
  const byLast = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, id: number) => m.set(k, [...(m.get(k) ?? []), id]);
  for (const a of athletes) {
    push(byFull, a.search_key, a.id);
    push(byLast, a.last_key, a.id);
  }
  return (text: string): number | null => {
    const k = normalize(text);
    if (!k) return null;
    const full = byFull.get(k);
    if (full?.length === 1) return full[0];
    const last = byLast.get(k);
    if (last?.length === 1) return last[0];
    return null;
  };
}

/** Rattache automatiquement les anciens pronos / résultats en texte libre quand c'est sans ambiguïté. */
export async function relinkLegacy(sql: Db = defaultSql) {
  const athletes = await allAthletes(sql);
  const resolve = makeResolver(athletes);
  for (const table of ["predictions", "results"] as const) {
    const rows = await sql`SELECT DISTINCT athlete FROM ${sql(table)} WHERE athlete_id IS NULL`;
    for (const r of rows) {
      const id = resolve(r.athlete);
      if (id) await sql`UPDATE ${sql(table)} SET athlete_id = ${id} WHERE athlete_id IS NULL AND athlete = ${r.athlete}`;
    }
  }
}

/** Athlètes validés qui ressemblent à `a` (doublon probable). */
export function similarTo(a: Pick<Athlete, "id" | "search_key" | "last_key">, pool: Athlete[]) {
  return pool
    .filter((b) => b.id !== a.id && b.status === "approved")
    .map((b) => ({
      b,
      d: Math.min(
        distance(a.search_key, b.search_key),
        a.last_key === b.last_key ? 0 : distance(a.last_key, b.last_key) + 1
      ),
    }))
    .filter((x) => x.d <= 2 || x.b.search_key.includes(a.last_key) && a.last_key.length >= 4)
    .sort((x, y) => x.d - y.d)
    .slice(0, 3)
    .map((x) => x.b);
}

/** Fusionne `fromId` dans `toId` : tous les pronos et résultats pointent vers `toId`. */
export async function mergeAthletes(fromId: number, toId: number) {
  if (fromId === toId) return;
  await sql.begin(async (tx) => {
    const [to] = await tx`SELECT display_name FROM athletes WHERE id = ${toId}`;
    if (!to) return;
    await tx`UPDATE predictions SET athlete_id = ${toId}, athlete = ${to.display_name} WHERE athlete_id = ${fromId}`;
    await tx`UPDATE results SET athlete_id = ${toId}, athlete = ${to.display_name} WHERE athlete_id = ${fromId}`;
    await tx`DELETE FROM athletes WHERE id = ${fromId}`;
  });
}

import { createHash } from "crypto";
import type { Db } from "./db";
import { normalize } from "./search";
import catalog from "./catalog-2026.json";

type Entry = {
  first_name: string;
  last_name: string;
  sport: string;
  gender: "M" | "F";
  country: string;
  intl: boolean;
  fr: boolean;
  note?: string;
};

const entries = catalog as Entry[];
const SYNC_REV = "4";

const HISTORY_RENAMES: [number, string, string][] = [[2025, "Dalin", "Charlie Dalin"]];

const PA = "Patinage artistique";
const REMAP: Record<string, string> = {
  [`guillaumecizeron|${PA}`]: `laurencefournierbeaudryguillaumecizeron|${PA}`,
  [`laurencefournierbeaudry|${PA}`]: `laurencefournierbeaudryguillaumecizeron|${PA}`,
  [`rikumiura|${PA}`]: `rikumiuraryuichikihara|${PA}`,
  [`ryuichikihara|${PA}`]: `rikumiuraryuichikihara|${PA}`,
  [`minervafabiennehase|${PA}`]: `minervafabiennehasenikitavolodin|${PA}`,
}; // à incrémenter quand la logique de synchro change

export function catalogVersion() {
  return createHash("sha1").update(SYNC_REV + JSON.stringify(entries)).digest("hex").slice(0, 12);
}

/** Charge le catalogue (lib/catalog-2026.json) en base. Appelé dans la transaction de boot. */
export async function syncCatalog(sql: Db) {
  // Recalcule les clés de recherche (la normalisation a pu évoluer)
  for (const a of await sql`SELECT id, display_name, last_name, search_key, last_key FROM athletes`) {
    const sk = normalize(a.display_name), lk = normalize(a.last_name);
    if (sk !== a.search_key || lk !== a.last_key) {
      const [clash] = await sql`SELECT 1 FROM athletes WHERE search_key = ${sk} AND sport = (SELECT sport FROM athletes WHERE id = ${a.id}) AND id <> ${a.id}`;
      if (!clash) await sql`UPDATE athletes SET search_key = ${sk}, last_key = ${lk} WHERE id = ${a.id}`;
    }
  }
  const rows = entries.map((e) => {
    const display = [e.first_name, e.last_name].filter(Boolean).join(" ");
    return {
      first_name: e.first_name, last_name: e.last_name, display_name: display,
      search_key: normalize(display), last_key: normalize(e.last_name), sport: e.sport, gender: e.gender,
      country: e.country.toUpperCase(), in_intl: e.intl, in_fr: e.fr, note: e.note ?? "", status: "approved",
    };
  });
  await sql`
    INSERT INTO athletes ${sql(rows, "first_name", "last_name", "display_name", "search_key", "last_key", "sport",
      "gender", "country", "in_intl", "in_fr", "note", "status")}
    ON CONFLICT (search_key, sport) DO UPDATE SET
      first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, display_name = EXCLUDED.display_name,
      last_key = EXCLUDED.last_key, gender = EXCLUDED.gender, country = EXCLUDED.country,
      in_intl = EXCLUDED.in_intl, in_fr = EXCLUDED.in_fr, note = EXCLUDED.note, status = 'approved'`;
  const keep = rows.map((r) => `${r.search_key}|${r.sport}`);
  // Fiches remplacées (patineurs regroupés en duo) : pronos et résultats basculent vers la nouvelle fiche
  for (const [oldKey, newKey] of Object.entries(REMAP)) {
    const [from] = await sql`SELECT id FROM athletes WHERE search_key || '|' || sport = ${oldKey}`;
    const [to] = await sql`SELECT id FROM athletes WHERE search_key || '|' || sport = ${newKey}`;
    if (from && to) {
      await sql`UPDATE predictions SET athlete_id = ${to.id}, athlete = (SELECT display_name FROM athletes WHERE id = ${to.id})
                WHERE athlete_id = ${from.id}`;
      await sql`UPDATE results SET athlete_id = ${to.id}, athlete = (SELECT display_name FROM athletes WHERE id = ${to.id})
                WHERE athlete_id = ${from.id}`;
    }
  }
  // Athlète déplacé de sport (ex. van der Poel) : on rebascule pronos et résultats vers la nouvelle fiche
  for (const table of ["predictions", "results"] as const) {
    await sql`
      UPDATE ${sql(table)} t SET athlete_id = n.id
      FROM athletes o JOIN athletes n ON n.search_key = o.search_key AND n.id <> o.id
      WHERE t.athlete_id = o.id AND o.created_by IS NULL
        AND NOT ((o.search_key || '|' || o.sport) = ANY(${keep}))
        AND ((n.search_key || '|' || n.sport) = ANY(${keep}))`;
  }
  // Retire les athlètes qui ne sont plus au catalogue (jamais ceux ajoutés par des joueurs ou déjà utilisés)
  await sql`
    DELETE FROM athletes a
    WHERE a.created_by IS NULL AND a.status = 'approved'
      AND NOT ((a.search_key || '|' || a.sport) = ANY(${keep}))
      AND NOT EXISTS (SELECT 1 FROM predictions p WHERE p.athlete_id = a.id)
      AND NOT EXISTS (SELECT 1 FROM results r WHERE r.athlete_id = a.id)`;
  // Corrections de noms dans les tops historiques déjà chargés en base
  for (const [season, from, to] of HISTORY_RENAMES)
    await sql`UPDATE results SET athlete = ${to}, athlete_id = NULL WHERE season = ${season} AND athlete = ${from}`;
  const { relinkLegacy } = await import("./athletes");
  await relinkLegacy(sql);
}

/** Charge les tops officiels des saisons passées (lib/history.ts) quand la saison est vide en base. */
export async function seedHistory(sql: Db) {
  const { HISTORY } = await import("./history");
  const { allAthletes, makeResolver } = await import("./athletes");
  const resolve = makeResolver(await allAthletes(sql));
  for (const [season, tops] of Object.entries(HISTORY)) {
    const [has] = await sql`SELECT 1 FROM results WHERE season = ${Number(season)} LIMIT 1`;
    if (has) continue;
    for (const cat of ["monde", "france"] as const)
      for (let i = 0; i < tops[cat].length; i++) {
        const name = tops[cat][i];
        await sql`INSERT INTO results (season, category, position, athlete, athlete_id)
                  VALUES (${Number(season)}, ${cat}, ${i + 1}, ${name}, ${resolve(name)})
                  ON CONFLICT DO NOTHING`;
      }
  }
}

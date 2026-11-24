import { createHash } from "crypto";
import { sql } from "./db";
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

/** Charge le catalogue (lib/catalog-2026.json) en base quand il a changé. Idempotent. */
export async function syncCatalog() {
  const entries = catalog as Entry[];
  const SYNC_REV = "2"; // à incrémenter quand la logique de synchro change
  const version = createHash("sha1").update(SYNC_REV + JSON.stringify(entries)).digest("hex").slice(0, 12);
  const [row] = await sql`SELECT value FROM settings WHERE key = 'catalog_version'`;
  if (row?.value === version) {
    await seedHistory();
    return;
  }
  for (const e of entries) {
    const display = [e.first_name, e.last_name].filter(Boolean).join(" ");
    await sql`
      INSERT INTO athletes (first_name, last_name, display_name, search_key, last_key, sport, gender, country,
                            in_intl, in_fr, note, status)
      VALUES (${e.first_name}, ${e.last_name}, ${display}, ${normalize(display)}, ${normalize(e.last_name)},
              ${e.sport}, ${e.gender}, ${e.country.toUpperCase()}, ${e.intl}, ${e.fr}, ${e.note ?? ""}, 'approved')
      ON CONFLICT (search_key, sport) DO UPDATE SET
        first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, display_name = EXCLUDED.display_name,
        last_key = EXCLUDED.last_key, gender = EXCLUDED.gender, country = EXCLUDED.country,
        in_intl = EXCLUDED.in_intl, in_fr = EXCLUDED.in_fr, note = EXCLUDED.note, status = 'approved'`;
  }
  const keep = entries.map((e) => `${normalize([e.first_name, e.last_name].filter(Boolean).join(" "))}|${e.sport}`);
  // Athlète déplacé de sport (ex. van der Poel) : on rebascule les pronos vers la nouvelle fiche
  await sql`
    UPDATE predictions p SET athlete_id = n.id
    FROM athletes o JOIN athletes n ON n.search_key = o.search_key AND n.id <> o.id
    WHERE p.athlete_id = o.id AND o.created_by IS NULL
      AND NOT ((o.search_key || '|' || o.sport) = ANY(${keep}))
      AND ((n.search_key || '|' || n.sport) = ANY(${keep}))`;
  await sql`
    UPDATE results r SET athlete_id = n.id
    FROM athletes o JOIN athletes n ON n.search_key = o.search_key AND n.id <> o.id
    WHERE r.athlete_id = o.id AND o.created_by IS NULL
      AND NOT ((o.search_key || '|' || o.sport) = ANY(${keep}))
      AND ((n.search_key || '|' || n.sport) = ANY(${keep}))`;
  // Retire les athlètes du catalogue qui n'y figurent plus (jamais ceux ajoutés par des joueurs ou déjà choisis)
  await sql`
    DELETE FROM athletes a
    WHERE a.created_by IS NULL AND a.status = 'approved'
      AND NOT ((a.search_key || '|' || a.sport) = ANY(${keep}))
      AND NOT EXISTS (SELECT 1 FROM predictions p WHERE p.athlete_id = a.id)
      AND NOT EXISTS (SELECT 1 FROM results r WHERE r.athlete_id = a.id)`;
  const { relinkLegacy } = await import("./athletes");
  await relinkLegacy();
  await seedHistory();
  await sql`INSERT INTO settings (key, value) VALUES ('catalog_version', ${version})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

/** Charge les tops officiels des saisons passées (lib/history.ts) quand la saison est vide en base. */
async function seedHistory() {
  const { HISTORY } = await import("./history");
  const { allAthletes, makeResolver } = await import("./athletes");
  const resolve = makeResolver(await allAthletes());
  for (const [season, tops] of Object.entries(HISTORY)) {
    const [has] = await sql`SELECT 1 FROM results WHERE season = ${Number(season)} LIMIT 1`;
    if (has) continue;
    for (const cat of ["monde", "france"] as const)
      for (let i = 0; i < tops[cat].length; i++) {
        const name = tops[cat][i];
        await sql`INSERT INTO results (season, category, position, athlete, athlete_id)
                  VALUES (${Number(season)}, ${cat}, ${i + 1}, ${name}, ${resolve(name)})`;
      }
  }
}

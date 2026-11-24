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
  const version = createHash("sha1").update(JSON.stringify(entries)).digest("hex").slice(0, 12);
  const [row] = await sql`SELECT value FROM settings WHERE key = 'catalog_version'`;
  if (row?.value === version) return;
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
  const { relinkLegacy } = await import("./athletes");
  await relinkLegacy();
  await sql`INSERT INTO settings (key, value) VALUES ('catalog_version', ${version})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

import Link from "next/link";
import { sql, ensureSchema } from "@/lib/db";
import { getResults } from "@/lib/data";
import { flag } from "@/lib/search";
import { Jersey } from "../components/jersey";

// Drapeaux des athlètes historiques absents du catalogue
const EXTRA_FLAGS: Record<string, string> = { "Simone Biles": "US" };

export default async function Palmares({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  await ensureSchema();
  const rows = await sql`SELECT DISTINCT season FROM results ORDER BY season DESC`;
  const seasons = rows.map((r) => r.season as number);
  const { saison } = await searchParams;
  const season = seasons.includes(Number(saison)) ? Number(saison) : seasons[0];
  const results = season ? await getResults(season) : null;
  const countries = new Map(
    (await sql`SELECT id, country FROM athletes`).map((r) => [r.id as number, String(r.country).trim()])
  );

  return (
    <>
      <div className="section-title" style={{ marginTop: 6 }}>
        <h1>Palmarès</h1>
        <nav className="season-switch">
          {seasons.map((s) => (
            <Link key={s} href={`/palmares?saison=${s}`} className={s === season ? "active" : ""}>
              {s}
            </Link>
          ))}
        </nav>
      </div>

      {results && (
        <div className="grid2">
          {(["monde", "france"] as const).map((c) => (
            <section key={c} className={`game ${c === "monde" ? "theme-rainbow" : "theme-blue"}`}>
              {c === "monde" && <div className="rainbow-band" />}
              <div className="art">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div className="kicker">Eurosport {season}</div>
                    <h2 style={{ fontSize: "2.1rem" }}>Top 10 {c === "monde" ? "Monde" : "France"}</h2>
                  </div>
                  <Jersey variant={c === "monde" ? "rainbow" : "blue"} size={50} tilt={-8} />
                </div>
                <ol className="standings" style={{ marginTop: 10 }}>
                  {results[c].map((a, i) => (
                    <li key={i}>
                      <span className={`medal ${i < 3 ? `m${i + 1}` : ""}`}>{i + 1}</span>
                      <span className="who">
                        {(() => {
                          const cc = (a.id && countries.get(a.id)) || EXTRA_FLAGS[a.name] || (c === "france" ? "FR" : "");
                          return cc ? `${flag(cc)} ` : "";
                        })()}
                        {a.name || "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          ))}
        </div>
      )}

    </>
  );
}

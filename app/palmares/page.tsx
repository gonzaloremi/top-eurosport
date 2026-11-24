import Link from "next/link";
import { sql, ensureSchema } from "@/lib/db";
import { getResults } from "@/lib/data";
import { flag } from "@/lib/search";
import { Jersey } from "../components/jersey";

// Drapeaux des athlètes historiques absents du catalogue
const EXTRA_FLAGS: Record<string, string> = { "Simone Biles": "US" };

// Maillots de l'édition familiale 2025 (Excel)
const FAMILY: Record<number, { league: string; jaune: [string, number][]; arc: [string, number][]; bleu: [string, number][] }> = {
  2025: {
    league: "GSC",
    jaune: [["Pierre", 27], ["Paul", 21], ["François", 21], ["Corentin", 19], ["Laurent", 17]],
    arc: [["Corentin", 13], ["François", 10], ["Paul", 10], ["Pierre", 9], ["Laurent", 8]],
    bleu: [["Pierre", 18], ["Paul", 11], ["François", 11], ["Laurent", 9], ["Corentin", 6]],
  },
};

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
  const fam = season ? FAMILY[season] : undefined;

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

      {fam && (
        <>
          <div className="section-title">
            <h2 style={{ fontSize: "2rem" }}>Maillots {season} · {fam.league}</h2>
          </div>
          <div className="grid3">
            {(
              [
                ["Maillot Jaune", "yellow", fam.jaune, "theme-yellow"],
                ["Arc-en-ciel", "rainbow", fam.arc, "theme-rainbow"],
                ["Maillot Bleu", "blue", fam.bleu, "theme-blue"],
              ] as const
            ).map(([title, sw, list, theme]) => (
              <div key={title} className={`game ${theme}`}>
                {sw === "rainbow" && <div className="rainbow-band" />}
                <div className="art" style={{ minHeight: 0 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h2>{title}</h2>
                    <Jersey variant={sw} size={44} tilt={-8} />
                  </div>
                  <ol className="standings" style={{ marginTop: 8 }}>
                    {list.map(([n, pts], i) => (
                      <li key={n}>
                        <span className={`medal ${i < 3 ? `m${i + 1}` : ""}`}>{i + 1}</span>
                        <span className="who">{n}</span>
                        <span className="score">{pts}<small>pts</small></span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

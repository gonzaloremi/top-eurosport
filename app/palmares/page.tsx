import { Jersey } from "../components/jersey";

const PALMARES = [
  {
    season: 2025,
    league: "GSC",
    jaune: [["Pierre", 27], ["Paul", 21], ["François", 21], ["Corentin", 19], ["Laurent", 17]],
    arc: [["Corentin", 13], ["François", 10], ["Paul", 10], ["Pierre", 9], ["Laurent", 8]],
    bleu: [["Pierre", 18], ["Paul", 11], ["François", 11], ["Laurent", 9], ["Corentin", 6]],
  },
] as const;

export default function Palmares() {
  return (
    <>
      <div className="kicker">Hall of fame</div>
      <h1 style={{ marginBottom: 18 }}>Palmarès</h1>
      {PALMARES.map((p) => (
        <section key={p.season}>
          <h2 style={{ margin: "0 2px 14px" }}>
            {p.season} — {p.league} <span className="muted small" style={{ fontFamily: "var(--body)", textTransform: "none" }}>(édition Excel)</span>
          </h2>
          <div className="grid3">
            {(
              [
                ["Maillot Jaune", "yellow", p.jaune, "theme-yellow"],
                ["Maillot Arc-en-ciel", "rainbow", p.arc, "theme-rainbow"],
                ["Maillot Bleu", "blue", p.bleu, "theme-blue"],
              ] as const
            ).map(([title, sw, rows, theme]) => (
              <div key={title} className={`game ${theme}`}>
                {sw === "rainbow" && <div className="rainbow-band" />}
                <div className="art">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h2>{title}</h2>
                    <Jersey variant={sw} size={48} tilt={-8} />
                  </div>
                  <ol className="standings" style={{ marginTop: 10 }}>
                    {rows.map(([n, pts], i) => (
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
        </section>
      ))}
    </>
  );
}

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
      <h1>Palmarès</h1>
      {PALMARES.map((p) => (
        <section key={p.season} className="card">
          <h2>
            {p.season} — {p.league} <span className="muted small">(édition Excel)</span>
          </h2>
          <div className="grid3">
            {(
              [
                ["Maillot Jaune", "yellow", p.jaune],
                ["Maillot Arc-en-ciel", "rainbow", p.arc],
                ["Maillot Bleu", "blue", p.bleu],
              ] as const
            ).map(([title, sw, rows]) => (
              <div key={title} className="jersey">
                <h3>
                  <span className={`swatch ${sw}`} /> {title}
                </h3>
                <table>
                  <tbody>
                    {rows.map(([n, pts], i) => (
                      <tr key={n} className={i === 0 ? "leader" : ""}>
                        <td className="rank">{i + 1}</td>
                        <td>{n}</td>
                        <td className="num">{pts} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

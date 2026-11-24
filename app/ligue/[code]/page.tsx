import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { computeStandings, getLeague, getMembers, hasResults } from "@/lib/data";
import { currentSeason, isLocked, timeLeft } from "@/lib/season";
import { rankBy, type Standing } from "@/lib/scoring";
import { leaveLeague } from "../../actions";
import { ConfirmButton, CopyButton } from "../../components/forms";
import { Jersey } from "../../components/jersey";
import { LEAGUE_HISTORY } from "@/lib/league-history";

type Key = "monde" | "france" | "total";

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const league = await getLeague(code);
  if (!league) notFound();
  const members = await getMembers(league.id);
  if (!members.some((m) => m.id === user.id)) redirect(`/rejoindre/${league.code}`);

  const now = currentSeason();
  const seasonRows = await sql`
    SELECT DISTINCT season FROM predictions WHERE user_id = ANY(${members.map((m) => m.id)})`;
  const seasons = [...new Set([now, ...seasonRows.map((r) => r.season as number)])]
    .filter((s) => s <= now)
    .sort((a, b) => b - a);
  const { saison } = await searchParams;
  const season = saison && seasons.includes(Number(saison)) ? Number(saison) : now;
  const locked = isLocked(season);

  const { standings, details, results } = await computeStandings(members, season);
  const published = hasResults(results);
  const submitted = standings.filter((s) => s.submitted).length;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const invite = `Rejoins ma ligue « ${league.name} » pour deviner les tops 10 de l'année ! Code : ${league.code} — ${origin}/rejoindre/${league.code}`;

  return (
    <>
      <section className="game theme-night dots">
        <div className="art" style={{ minHeight: 0 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
            <div>
              <div className="kicker">Ligue privée · saison {season}</div>
              <h1 style={{ marginTop: 6 }}>{league.name}</h1>
              <p className="muted" style={{ marginTop: 8 }}>
                {members.length} joueur{members.length > 1 ? "s" : ""} · {submitted} classement
                {submitted > 1 ? "s" : ""} envoyé{submitted > 1 ? "s" : ""}
              </p>
            </div>
            <div className="code-tiles" aria-label={`Code ${league.code}`}>
              {league.code.split("").map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </div>
        <div className="bar">
          {seasons.length > 1 ? (
            <nav className="season-switch grow">
              {seasons.map((s) => (
                <Link key={s} href={`/ligue/${league.code}?saison=${s}`} className={s === season ? "active" : ""}>
                  {s}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="grow sub">Partage le code</div>
          )}
          <CopyButton text={invite} label="📨 Inviter" />
        </div>
      </section>

      {!locked ? (
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="kicker">Pronostics en cours</div>
              <h2 style={{ fontSize: "2rem" }}>Clôture dans {timeLeft(season)}</h2>
              <p className="muted small">Les pronos de chacun sont dévoilés à la clôture.</p>
            </div>
            <Link href="/pronos" className="btn blue">Mon classement</Link>
          </div>
          <ul className="list-plain" style={{ marginTop: 14 }}>
            {standings.map((s) => (
              <li key={s.userId}>
                <strong>
                  {s.name}
                  {s.userId === user.id && <span className="muted"> (moi)</span>}
                </strong>
                {s.submitted ? <span className="chip ok">✔ envoyé</span> : <span className="chip wait">⏳ pas encore</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {!published && (
            <p className="alert ok" style={{ marginBottom: 22 }}>
              🔒 Pronos fermés · verdict Eurosport fin décembre.
            </p>
          )}

          <YellowJersey standings={standings} meId={user.id} published={published} />

          <div className="grid2">
            <JerseyCard k="monde" title="Maillot Arc-en-ciel" sub="Top 10 Monde" theme="theme-rainbow" variant="rainbow" standings={standings} meId={user.id} published={published} />
            <JerseyCard k="france" title="Maillot Bleu" sub="Top 10 France" theme="theme-blue" variant="blue" standings={standings} meId={user.id} published={published} />
          </div>

          {published && (
            <section className="card">
              <div className="kicker">Verdict Eurosport</div>
              <h2 style={{ marginBottom: 6 }}>Tops 10 officiels {season}</h2>
              <div className="picks official">
                {(["monde", "france"] as const).map((c) => (
                  <div key={c}>
                    <div className="row" style={{ gap: 8 }}>
                      <Jersey variant={c === "monde" ? "rainbow" : "blue"} size={28} />
                      <strong>{c === "monde" ? "Monde" : "France"}</strong>
                    </div>
                    <ol>
                      {results[c].map((a, i) => (
                        <li key={i}><span className="grow">{a.name || "—"}</span></li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <div className="kicker">Qui a dit quoi</div>
            <h2>Les classements de chacun</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              <span className="pts pts-3">3</span> bonne place · <span className="pts pts-1">1</span> dans le top 10 mais mal placé
            </p>
            {standings.map((s) => {
              const d = details.get(s.userId)!;
              return (
                <details key={s.userId} className="player" open={s.userId === user.id}>
                  <summary>
                    {s.name}
                    {published && s.submitted && <span className="chip ok">{s.total} pts</span>}
                    {!s.submitted && <span className="chip wait">pas de prono</span>}
                  </summary>
                  {s.submitted && (
                    <div className="picks">
                      {(["monde", "france"] as const).map((c) => (
                        <div key={c}>
                          <div className="row" style={{ gap: 8 }}>
                            <Jersey variant={c === "monde" ? "rainbow" : "blue"} size={26} />
                            <strong>{c === "monde" ? "Monde" : "France"}</strong>
                            {published && <span className="muted small">· {d[c].total} pts</span>}
                          </div>
                          <ol>
                            {d[c].details.map((p) => (
                              <li key={p.position}>
                                <span className="grow">{p.athlete || <span className="muted">—</span>}</span>
                                {published && p.athlete && <span className={`pts pts-${p.points}`}>{p.points}</span>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </section>
        </>
      )}

      {(LEAGUE_HISTORY[league.code] ?? []).map((h) => (
        <section key={h.season} style={{ marginTop: 8 }}>
          <div className="section-title">
            <h2 style={{ fontSize: "2rem" }}>Palmarès {h.season}</h2>
            <span className="kicker">édition Excel</span>
          </div>
          <div className="grid3">
            {(
              [
                ["Maillot Jaune", "yellow", h.jaune, "theme-yellow"],
                ["Arc-en-ciel", "rainbow", h.arc, "theme-rainbow"],
                ["Maillot Bleu", "blue", h.bleu, "theme-blue"],
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
        </section>
      ))}

      <form action={leaveLeague} style={{ textAlign: "center", marginTop: 8 }}>
        <input type="hidden" name="code" value={league.code} />
        <ConfirmButton message="Quitter cette ligue ?">Quitter la ligue</ConfirmButton>
      </form>
    </>
  );
}

function ranked(standings: Standing[], k: Key) {
  return rankBy(standings.filter((s) => s.submitted), (s) => s[k], (s) => s.exact);
}

function YellowJersey({ standings, meId, published }: { standings: Standing[]; meId: number; published: boolean }) {
  const rows = ranked(standings, "total");
  const top = published ? rows.slice(0, 3) : [];
  const order = [top[1], top[0], top[2]];
  return (
    <section className="game theme-yellow">
      <div className="art">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="kicker">Classement général</div>
            <h2 style={{ fontSize: "2.6rem" }}>Maillot Jaune</h2>
          </div>
          <span className="float"><Jersey variant="yellow" size={76} tilt={8} number={1} /></span>
        </div>
        {published && top.length > 0 && (
          <div className="podium">
            {order.map((r, i) =>
              r ? (
                <div key={r.row.userId} className={`step p${r.rank <= 3 ? r.rank : 3}`}>
                  {r.rank === 1 && <div style={{ fontSize: "1.6rem" }}>👑</div>}
                  <div className="name">{r.row.name}</div>
                  <div className="block">{r.rank}</div>
                  <div className="podium-pts">{r.row.total} pts</div>
                </div>
              ) : (
                <div key={`empty-${i}`} />
              )
            )}
          </div>
        )}
        <StandingsList rows={published ? rows.slice(3) : rows} k="total" meId={meId} published={published} />
      </div>
    </section>
  );
}

function JerseyCard(props: {
  k: Key; title: string; sub: string; theme: string; variant: "rainbow" | "blue";
  standings: Standing[]; meId: number; published: boolean;
}) {
  const rows = ranked(props.standings, props.k);
  return (
    <section className={`game ${props.theme}`}>
      {props.variant === "rainbow" && <div className="rainbow-band" />}
      <div className="art">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="kicker">{props.sub}</div>
            <h2 style={{ fontSize: "2.1rem" }}>{props.title}</h2>
          </div>
          <Jersey variant={props.variant} size={58} tilt={-8} />
        </div>
        <StandingsList rows={rows} k={props.k} meId={props.meId} published={props.published} />
      </div>
    </section>
  );
}

function StandingsList({
  rows, k, meId, published,
}: { rows: { rank: number; row: Standing }[]; k: Key; meId: number; published: boolean }) {
  if (rows.length === 0 && !published) return <p className="muted" style={{ marginTop: 12 }}>Personne n&apos;a envoyé de classement.</p>;
  return (
    <ol className="standings" style={{ marginTop: 10 }}>
      {rows.map(({ rank, row }) => (
        <li key={row.userId} className={row.userId === meId ? "me" : ""}>
          <span className={`medal ${published && rank <= 3 ? `m${rank}` : ""}`}>{published ? rank : "–"}</span>
          <span className="who">{row.name}</span>
          {published && <span className="score">{row[k]}<small>pts</small></span>}
        </li>
      ))}
    </ol>
  );
}

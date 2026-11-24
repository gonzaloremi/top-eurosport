import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { computeStandings, getLeague, getMembers, hasResults } from "@/lib/data";
import { currentSeason, formatDeadline, isLocked, timeLeft } from "@/lib/season";
import { rankBy, type Standing } from "@/lib/scoring";
import { leaveLeague } from "../../actions";
import { ConfirmButton, CopyButton } from "../../components/forms";

const JERSEYS = [
  { key: "monde", title: "Maillot Arc-en-ciel", sub: "Top 10 Monde", swatch: "rainbow" },
  { key: "france", title: "Maillot Bleu", sub: "Top 10 France", swatch: "blue" },
  { key: "total", title: "Maillot Jaune", sub: "Classement général", swatch: "yellow" },
] as const;

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
    SELECT DISTINCT season FROM predictions WHERE user_id = ANY(${members.map((m) => m.id)})
    UNION SELECT DISTINCT season FROM results`;
  const seasons = [...new Set([now, ...seasonRows.map((r) => r.season as number)])]
    .filter((s) => s <= now)
    .sort((a, b) => b - a);
  const { saison } = await searchParams;
  const season = saison && seasons.includes(Number(saison)) ? Number(saison) : now;
  const locked = isLocked(season);

  const { standings, details, results } = await computeStandings(members, season);
  const published = hasResults(results);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const invite = `Rejoins ma ligue « ${league.name} » pour deviner les tops 10 de l'année ! Code : ${league.code} — ${origin}/rejoindre/${league.code}`;

  return (
    <>
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0 }}>{league.name}</h1>
            <p className="muted small">
              {members.length} joueur{members.length > 1 ? "s" : ""} · code{" "}
              <span className="code">{league.code}</span>
            </p>
          </div>
          <CopyButton text={invite} label="📨 Inviter" />
        </div>
        {seasons.length > 1 && (
          <nav className="season-switch" style={{ marginTop: 12 }}>
            {seasons.map((s) => (
              <Link key={s} href={`/ligue/${league.code}?saison=${s}`} className={s === season ? "active" : ""}>
                {s}
              </Link>
            ))}
          </nav>
        )}
      </section>

      {!locked ? (
        <section className="card">
          <h2>Saison {season} — pronostics en cours</h2>
          <p className="muted">
            Date limite : {formatDeadline(season)} (encore {timeLeft(season)}). Les classements de
            chacun seront dévoilés à ce moment-là.
          </p>
          <ul className="league-list">
            {standings.map((s) => (
              <li key={s.userId}>
                <span>
                  {s.name}
                  {s.userId === user.id && " (moi)"}
                </span>
                {s.submitted ? (
                  <span className="badge ok">✔︎ envoyé</span>
                ) : (
                  <span className="badge wait">⏳ pas encore</span>
                )}
              </li>
            ))}
          </ul>
          <Link href="/pronos" className="btn" style={{ marginTop: 12 }}>
            Mon classement
          </Link>
        </section>
      ) : (
        <>
          {!published && (
            <p className="alert ok">
              🔒 Pronostics fermés. En attente des tops 10 officiels Eurosport {season} pour
              calculer les points.
            </p>
          )}
          <div className="grid3">
            {JERSEYS.map((j) => (
              <JerseyTable key={j.key} jersey={j} standings={standings} meId={user.id} published={published} />
            ))}
          </div>

          {published && (
            <section className="card">
              <h2>Tops 10 officiels {season}</h2>
              <div className="picks">
                {(["monde", "france"] as const).map((c) => (
                  <div key={c}>
                    <strong>{c === "monde" ? "🌍 Monde" : "🇫🇷 France"}</strong>
                    <ol>
                      {results[c].map((a, i) => (
                        <li key={i}>{a || "—"}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2>Les classements de chacun</h2>
            <p className="muted small">
              <span className="pts pts-3">3</span> bonne place ·{" "}
              <span className="pts pts-1">1</span> dans le top 10 mais mal placé
            </p>
            {standings.map((s) => {
              const d = details.get(s.userId)!;
              return (
                <details key={s.userId} className="player" open={s.userId === user.id}>
                  <summary>
                    {s.name} {published && <span className="muted">— {s.total} pts</span>}
                    {!s.submitted && <span className="muted"> — pas de prono</span>}
                  </summary>
                  {s.submitted && (
                    <div className="picks">
                      {(["monde", "france"] as const).map((c) => (
                        <div key={c}>
                          <strong>
                            {c === "monde" ? "🌍 Monde" : "🇫🇷 France"}
                            {published && ` · ${d[c].total} pts`}
                          </strong>
                          <ol>
                            {d[c].details.map((p) => (
                              <li key={p.position}>
                                {p.athlete || <span className="muted">—</span>}
                                {published && p.athlete && (
                                  <span className={`pts pts-${p.points}`}>{p.points}</span>
                                )}
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

      <form action={leaveLeague} style={{ textAlign: "center", marginTop: 24 }}>
        <input type="hidden" name="code" value={league.code} />
        <ConfirmButton message="Quitter cette ligue ?">Quitter la ligue</ConfirmButton>
      </form>
    </>
  );
}

function JerseyTable({
  jersey,
  standings,
  meId,
  published,
}: {
  jersey: (typeof JERSEYS)[number];
  standings: Standing[];
  meId: number;
  published: boolean;
}) {
  const ranked = rankBy(
    standings.filter((s) => s.submitted),
    (s) => s[jersey.key],
    (s) => s.exact
  );
  return (
    <section className="jersey">
      <h3>
        <span className={`swatch ${jersey.swatch}`} />
        {jersey.title}
      </h3>
      <p className="muted small" style={{ marginTop: -6 }}>
        {jersey.sub}
      </p>
      <table>
        <tbody>
          {ranked.map(({ rank, row }) => (
            <tr
              key={row.userId}
              className={`${row.userId === meId ? "me" : ""} ${published && rank === 1 ? "leader" : ""}`}
            >
              <td className="rank">{published ? rank : "–"}</td>
              <td>{row.name}</td>
              <td className="num">{published ? `${row[jersey.key]} pts` : ""}</td>
            </tr>
          ))}
          {ranked.length === 0 && (
            <tr>
              <td className="muted">Personne n&apos;a envoyé de classement.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

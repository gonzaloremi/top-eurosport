import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allAthletes, makeResolver, similarTo, toLite } from "@/lib/athletes";
import { getResults } from "@/lib/data";
import { currentSeason } from "@/lib/season";
import { flag, search } from "@/lib/search";
import { adminDeleteUser, adminRemoveMember, editAthlete, linkLegacy, mergeAthlete, proposeAthlete, rotateAnalyticsToken, saveResults, setAdmin } from "../actions";
import { ConfirmButton, TokenForm, Top10Form } from "../components/forms";

export default async function Admin({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const me = await requireAdmin();
  const now = currentSeason();
  const { saison } = await searchParams;
  const season = Number(saison) || now;
  const [results, athletes, users, legacyRows] = await Promise.all([
    getResults(season),
    allAthletes(),
    sql<{ id: number; display_name: string; is_admin: boolean; picks: number; leagues: { id: number; name: string; code: string }[] }[]>`
      SELECT u.id, u.display_name, u.is_admin,
             (SELECT count(*)::int FROM predictions p WHERE p.user_id = u.id
                AND p.season = ${now}) AS picks,
             COALESCE((SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'code', l.code) ORDER BY l.name)
                       FROM league_members m JOIN leagues l ON l.id = m.league_id WHERE m.user_id = u.id), '[]') AS leagues
      FROM users u ORDER BY u.created_at`,
    sql<{ athlete: string; n: number; users: string }[]>`
      SELECT p.athlete, count(*)::int AS n, string_agg(DISTINCT u.display_name, ', ') AS users
      FROM predictions p JOIN users u ON u.id = p.user_id
      WHERE p.athlete_id IS NULL GROUP BY p.athlete ORDER BY n DESC`,
  ]);
  const lite = athletes.map(toLite);
  const resolve = makeResolver(athletes);
  const legacy = legacyRows.filter((r) => !resolve(r.athlete));
  const pending = athletes.filter((a) => a.status === "pending");
  const todo = pending.length + legacy.length;
  const sportsList = [...new Set(athletes.map((a) => a.sport))].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <>
      <div className="section-title" style={{ marginTop: 6 }}>
        <div>
          <div className="kicker">Espace admin</div>
          <h1>Revue & résultats</h1>
        </div>
        <Link href="/admin/catalogue" className="pill">📚 Catalogue ({athletes.length})</Link>
      </div>

      <section id="revue" className={`game ${todo ? "theme-yellow" : "theme-pitch"}`}>
        <div className="art" style={{ minHeight: 0 }}>
          <div className="kicker">À vérifier</div>
          <h2 style={{ fontSize: "2.2rem" }}>
            {todo ? `${todo} élément${todo > 1 ? "s" : ""} à revoir` : "Tout est propre ✔"}
          </h2>
          <p style={{ marginTop: 6 }}>Ajouts des joueurs et noms non reconnus.</p>

          {pending.map((a) => {
            const similar = similarTo(a, athletes);
            return (
              <div key={a.id} className="review-item">
                <div className="grow">
                  <strong>
                    {flag(a.country.trim())} {a.display_name}
                  </strong>{" "}
                  <span className="small">
                    · {a.sport} · {a.gender === "F" ? "F" : "H"}
                  </span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {similar.map((b) => (
                    <form key={b.id} action={mergeAthlete}>
                      <input type="hidden" name="from" value={a.id} />
                      <input type="hidden" name="to" value={b.id} />
                      <button className="btn ghost" title={`Fusionner dans ${b.display_name} (${b.sport})`}>
                        = {b.display_name}
                      </button>
                    </form>
                  ))}
                  <form action={editAthlete} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="first_name" defaultValue={a.first_name} placeholder="Prénom" aria-label="Prénom" />
                    <input name="last_name" defaultValue={a.last_name} placeholder="Nom" aria-label="Nom" required />
                    <button className="btn dark">✔ Valider</button>
                  </form>
                </div>
              </div>
            );
          })}

          {legacy.map((r) => {
            const guesses = search(lite, r.athlete, { limit: 3 });
            return (
              <div key={r.athlete} className="review-item">
                <div className="grow">
                  <strong>⚠️ « {r.athlete} »</strong>{" "}
                  <span className="small">· saisi à la main</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {guesses.map((g) => (
                    <form key={g.id} action={linkLegacy}>
                      <input type="hidden" name="text" value={r.athlete} />
                      <input type="hidden" name="athlete_id" value={g.id} />
                      <button className="btn ghost">→ {flag(g.c)} {g.n}</button>
                    </form>
                  ))}
                  <form action={linkLegacy} className="inline">
                    <input type="hidden" name="text" value={r.athlete} />
                    <select name="athlete_id" required defaultValue="">
                      <option value="" disabled>Autre athlète…</option>
                      {sportsList.map((sp) => (
                        <optgroup key={sp} label={sp}>
                          {athletes.filter((x) => x.sport === sp).map((x) => (
                            <option key={x.id} value={x.id}>{x.display_name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button className="btn ghost">OK</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="section-title">
        <div>
          <div className="kicker">Verdict Eurosport</div>
          <h2 style={{ fontSize: "2.2rem" }}>Tops 10 officiels</h2>
        </div>
        <nav className="season-switch">
          {[now - 2, now - 1, now].map((s) => (
            <Link key={s} href={`/admin?saison=${s}`} className={s === season ? "active" : ""}>
              {s}
            </Link>
          ))}
        </nav>
      </div>
      <Top10Form
        key={season}
        action={saveResults}
        propose={proposeAthlete}
        initial={results}
        catalogue={lite}
        submitLabel={`Enregistrer les tops 10 officiels ${season}`}
        hidden={{ season }}
      />

      <section className="card" style={{ marginTop: 22 }}>
        <div className="kicker">API lecture seule · /api/analytics</div>
        <h2 style={{ marginBottom: 6 }}>Accès analytique</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Permet d&apos;interroger la base en SQL (vues sans mots de passe, transaction en lecture seule).
          Générer un nouveau jeton révoque le précédent.
        </p>
        <TokenForm action={rotateAnalyticsToken} />
      </section>

      <section className="card" id="joueurs">
        <div className="kicker">{users.length} comptes</div>
        <h2 style={{ marginBottom: 10 }}>Joueurs</h2>
        <ul className="list-plain">
          {users.map((u) => (
            <li key={u.id} style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ minWidth: 160, flex: 1 }}>
                <strong>{u.display_name}</strong> {u.is_admin && <span className="chip ok">admin</span>}
                <div className="small muted">Prono {now} : {u.picks}/20</div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  {u.leagues.map((l) => (
                    <form key={l.id} action={adminRemoveMember} className="league-chip">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="leagueId" value={l.id} />
                      <span>{l.name}</span>
                      <ConfirmButton className="chip-x" message={`Retirer ${u.display_name} de « ${l.name} » ?`}>✕</ConfirmButton>
                    </form>
                  ))}
                  {u.leagues.length === 0 && <span className="small muted">aucune ligue</span>}
                </div>
              </div>
              {u.id !== me.id && (
                <div className="row" style={{ gap: 6 }}>
                  <form action={setAdmin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="value" value={u.is_admin ? "0" : "1"} />
                    <button className="btn ghost">{u.is_admin ? "Retirer admin" : "Rendre admin"}</button>
                  </form>
                  <form action={adminDeleteUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <ConfirmButton className="btn ghost danger-text" message={`Supprimer définitivement le compte « ${u.display_name} » et ses pronos ?`}>
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allAthletes, makeResolver, similarTo, toLite } from "@/lib/athletes";
import { getResults } from "@/lib/data";
import { currentSeason } from "@/lib/season";
import { flag, search } from "@/lib/search";
import { editAthlete, linkLegacy, mergeAthlete, proposeAthlete, rotateAnalyticsToken, saveResults, setAdmin } from "../actions";
import { TokenForm, Top10Form } from "../components/forms";

export default async function Admin({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const me = await requireAdmin();
  const now = currentSeason();
  const { saison } = await searchParams;
  const season = Number(saison) || now;
  const [results, athletes, users, legacyRows] = await Promise.all([
    getResults(season),
    allAthletes(),
    sql<{ id: number; display_name: string; is_admin: boolean }[]>`
      SELECT id, display_name, is_admin FROM users ORDER BY created_at`,
    sql<{ athlete: string; n: number; users: string }[]>`
      SELECT p.athlete, count(*)::int AS n, string_agg(DISTINCT u.display_name, ', ') AS users
      FROM predictions p JOIN users u ON u.id = p.user_id
      WHERE p.athlete_id IS NULL GROUP BY p.athlete ORDER BY n DESC`,
  ]);
  const lite = athletes.map(toLite);
  const resolve = makeResolver(athletes);
  const legacy = legacyRows.filter((r) => !resolve(r.athlete));
  const pending = athletes.filter((a) => a.status === "pending");
  const creators = new Map(users.map((u) => [u.id, u.display_name]));
  const usage = new Map(
    (await sql`SELECT athlete_id, count(*)::int AS n FROM predictions WHERE athlete_id IS NOT NULL GROUP BY athlete_id`).map(
      (r) => [r.athlete_id as number, r.n as number]
    )
  );
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
                    · {a.sport} · {a.gender === "F" ? "F" : "H"} · ajouté par {creators.get(a.created_by ?? 0) ?? "?"} ·{" "}
                    {usage.get(a.id) ?? 0} prono(s)
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
                  <span className="small">· saisi à la main par {r.users} ({r.n})</span>
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

      <section className="card">
        <h2 style={{ marginBottom: 6 }}>Administrateurs</h2>
        <ul className="list-plain">
          {users.map((u) => (
            <li key={u.id}>
              <span>
                {u.display_name} {u.is_admin && <span className="chip ok">admin</span>}
              </span>
              {u.id !== me.id && (
                <form action={setAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="value" value={u.is_admin ? "0" : "1"} />
                  <button className="btn ghost">{u.is_admin ? "Retirer admin" : "Rendre admin"}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

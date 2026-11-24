import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getAliases, getKnownAthletes, getResults, hasResults } from "@/lib/data";
import { currentSeason } from "@/lib/season";
import { normalize } from "@/lib/scoring";
import { saveAlias, saveResults, setAdmin } from "../actions";
import { Top10Form } from "../components/forms";

export default async function Admin({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const me = await requireAdmin();
  const now = currentSeason();
  const { saison } = await searchParams;
  const season = Number(saison) || now;
  const [results, athletes, aliases, users] = await Promise.all([
    getResults(season),
    getKnownAthletes(),
    getAliases(season),
    sql<{ id: number; display_name: string; is_admin: boolean }[]>`
      SELECT id, display_name, is_admin FROM users ORDER BY created_at`,
  ]);

  // Noms pronostiqués qui ne correspondent à aucun athlète officiel (fautes de frappe…)
  const officialByKey = new Map<string, string>();
  for (const c of ["monde", "france"] as const)
    for (const a of results[c]) if (a) officialByKey.set(normalize(a), a);
  const picks = await sql`SELECT DISTINCT athlete FROM predictions WHERE season = ${season}`;
  const unmatched = new Map<string, string>();
  for (const p of picks) {
    const k = normalize(p.athlete);
    if (k && !officialByKey.has(k) && !unmatched.has(k)) unmatched.set(k, p.athlete);
  }

  return (
    <>
      <div className="kicker">Espace admin</div>
      <h1 style={{ marginBottom: 12 }}>Tops 10 officiels</h1>
      <nav className="season-switch" style={{ marginBottom: 12 }}>
        {[now - 1, now, now + 1].map((s) => (
          <Link key={s} href={`/admin?saison=${s}`} className={s === season ? "active" : ""}>
            {s}
          </Link>
        ))}
      </nav>
      <p className="muted" style={{ marginBottom: 18 }}>
        Saisis les tops 10 publiés par Eurosport pour la saison {season}. Les points de toutes les
        ligues sont recalculés immédiatement. Les accents, majuscules, espaces et tirets sont
        ignorés pour comparer les noms.
      </p>
      <Top10Form
        key={season}
        action={saveResults}
        initial={results}
        athletes={athletes}
        submitLabel={`Enregistrer les tops 10 officiels ${season}`}
        hidden={{ season }}
      />

      {hasResults(results) && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 6 }}>Noms à rapprocher</h2>
          <p className="muted small">
            Noms saisis par les joueurs qui ne correspondent à aucun athlète officiel. Si c&apos;est
            une faute de frappe (ex : « Mbape »), associe-le au bon athlète. Sinon, laisse vide.
          </p>
          {unmatched.size === 0 && <p className="muted">Rien à rapprocher 👍</p>}
          <datalist id="official">
            {[...officialByKey.values()].map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          {[...unmatched.entries()].map(([k, name]) => {
            const current = aliases.get(k);
            return (
              <form key={k} action={saveAlias} className="row" style={{ margin: "6px 0" }}>
                <input type="hidden" name="season" value={season} />
                <input type="hidden" name="from" value={name} />
                <strong style={{ minWidth: 140 }}>{name} →</strong>
                <input
                  name="to"
                  list="official"
                  defaultValue={current ? officialByKey.get(current) ?? "" : ""}
                  placeholder="(aucun)"
                />
                <button className="btn ghost">OK</button>
              </form>
            );
          })}
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
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

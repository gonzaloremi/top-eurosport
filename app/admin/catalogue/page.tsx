import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allAthletes } from "@/lib/athletes";
import { ensureSchema } from "@/lib/db";
import { flag } from "@/lib/search";
import { deleteAthlete } from "../../actions";

export default async function Catalogue() {
  await requireAdmin();
  await ensureSchema();
  const athletes = await allAthletes();
  const usage = new Map(
    (await sql`SELECT athlete_id, count(*)::int AS n FROM predictions WHERE athlete_id IS NOT NULL GROUP BY athlete_id`).map(
      (r) => [r.athlete_id as number, r.n as number]
    )
  );
  const bySport = new Map<string, typeof athletes>();
  for (const a of athletes) bySport.set(a.sport, [...(bySport.get(a.sport) ?? []), a]);
  const sports = [...bySport.keys()].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <>
      <div className="section-title" style={{ marginTop: 6 }}>
        <div>
          <div className="kicker">{athletes.length} athlètes · {sports.length} sports</div>
          <h1>Catalogue</h1>
        </div>
        <Link href="/admin" className="pill">← Admin</Link>
      </div>
      <p className="muted" style={{ margin: "-4px 2px 18px" }}>
        Pré-rempli avec les candidats crédibles de la saison (5 max par sport et par genre, Monde et France).
        Les joueurs peuvent en ajouter ; ils apparaissent dans la revue admin.
      </p>
      <div className="catalogue">
        {sports.map((s) => (
          <section key={s} className="card">
            <h3 style={{ fontFamily: "var(--display)", fontWeight: 400, fontSize: "1.4rem", textTransform: "uppercase" }}>{s}</h3>
            <ul className="list-plain small">
              {bySport.get(s)!.map((a) => (
                <li key={a.id}>
                  <span title={a.note}>
                    {flag(a.country.trim())} <strong>{a.display_name}</strong>{" "}
                    <span className="muted">
                      {a.gender === "F" ? "F" : "H"}
                      {a.in_intl && " · 🌍"}
                      {a.in_fr && " · 🇫🇷 top"}
                    </span>
                    {a.status === "pending" && <span className="chip wait" style={{ marginLeft: 6 }}>à valider</span>}
                  </span>
                  {!usage.get(a.id) && (
                    <form action={deleteAthlete}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn link" title="Supprimer">✕</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

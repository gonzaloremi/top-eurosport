import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyLeagues, getPredictions } from "@/lib/data";
import { currentSeason, formatDeadline, isLocked, timeLeft } from "@/lib/season";
import { createLeague, joinLeague } from "./actions";
import { InlineForm } from "./components/forms";

export default async function Home() {
  const user = await requireUser();
  const season = currentSeason();
  const locked = isLocked(season);
  const [leagues, preds] = await Promise.all([
    getMyLeagues(user.id),
    getPredictions([user.id], season),
  ]);
  const mine = preds.get(user.id);
  const filled = mine ? mine.monde.filter(Boolean).length + mine.france.filter(Boolean).length : 0;

  return (
    <>
      <section className="hero">
        <p className="muted">Salut {user.display_name} 👋 — Saison {season}</p>
        {locked ? (
          <>
            <h1>Les pronostics {season} sont fermés 🔒</h1>
            <p className="muted">
              Place au verdict : les classements des ligues se mettent à jour dès que les tops 10
              officiels sont publiés.
            </p>
          </>
        ) : (
          <>
            <div className="countdown">{timeLeft(season)}</div>
            <p className="muted">
              pour envoyer ton classement — date limite : {formatDeadline(season)}
            </p>
            <p style={{ margin: "14px 0 4px" }}>
              {filled === 20 ? (
                <>✅ Ton classement est complet (20/20). Tu peux encore le modifier.</>
              ) : filled > 0 ? (
                <>⚠️ Classement incomplet : {filled}/20 athlètes.</>
              ) : (
                <>⏳ Tu n&apos;as pas encore envoyé ton classement.</>
              )}
            </p>
          </>
        )}
        <Link href="/pronos" className="btn" style={{ marginTop: 10 }}>
          {locked ? "Voir mon prono" : filled ? "Modifier mon prono" : "Faire mon prono"}
        </Link>
      </section>

      <section className="card">
        <h2>Mes ligues</h2>
        {leagues.length === 0 ? (
          <p className="muted">
            Tu n&apos;es dans aucune ligue. Crée-en une pour ta famille ou rejoins-en une avec son
            code à 4 lettres.
          </p>
        ) : (
          <ul className="league-list">
            {leagues.map((l) => (
              <li key={l.id}>
                <Link href={`/ligue/${l.code}`}>{l.name}</Link>
                <span className="muted small">
                  {l.members} joueur{l.members > 1 ? "s" : ""} · <span className="code">{l.code}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid2">
        <section className="card">
          <h2>Rejoindre une ligue</h2>
          <InlineForm
            action={joinLeague}
            name="code"
            placeholder="ABCD"
            button="Rejoindre"
            extra={{ maxLength: 4, minLength: 4, className: "code-input", autoComplete: "off", autoCapitalize: "characters" }}
          />
        </section>
        <section className="card">
          <h2>Créer une ligue</h2>
          <InlineForm
            action={createLeague}
            name="name"
            placeholder="Ex : Famille Dupont"
            button="Créer"
            extra={{ maxLength: 40 }}
          />
        </section>
      </div>
    </>
  );
}

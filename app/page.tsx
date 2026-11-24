import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyLeagues, getPredictions } from "@/lib/data";
import { currentSeason, deadline, formatDeadline, isLocked } from "@/lib/season";
import { createLeague, joinLeague } from "./actions";
import { InlineForm } from "./components/forms";
import { Jersey } from "./components/jersey";

function countdown(season: number) {
  const ms = Math.max(0, deadline(season).getTime() - Date.now());
  return {
    j: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
  };
}
const pad = (n: number) => String(n).padStart(2, "0");

export default async function Home() {
  const user = await requireUser();
  const season = currentSeason();
  const locked = isLocked(season);
  const [leagues, preds] = await Promise.all([getMyLeagues(user.id), getPredictions([user.id], season)]);
  const mine = preds.get(user.id);
  const filled = mine ? mine.monde.filter(Boolean).length + mine.france.filter(Boolean).length : 0;
  const t = countdown(season);

  return (
    <>
      <div className="hero-grid">
        <section className="game theme-night dots">
          <div className="art" style={{ paddingBottom: 26 }}>
            <div className="kicker">Saison {season}</div>
            <h1 style={{ maxWidth: "11ch", marginTop: 6 }}>
              {locked ? (
                <>Les jeux sont faits</>
              ) : (
                <>
                  Salut {user.display_name}
                  <span style={{ color: "var(--yellow)" }}> !</span>
                </>
              )}
            </h1>
            <div className="jersey-stack">
              <span className="float"><Jersey variant="rainbow" size={70} tilt={-12} number={1} /></span>
              <span className="float d2"><Jersey variant="yellow" size={86} number={1} /></span>
              <span className="float d3"><Jersey variant="blue" size={70} tilt={12} number={1} /></span>
            </div>
            {locked ? (
              <p className="muted" style={{ marginTop: 14, maxWidth: "42ch" }}>
                Les pronostics sont fermés. Les maillots seront attribués dès la publication des tops 10
                officiels.
              </p>
            ) : (
              <>
                <div className="timer" aria-label="Temps restant">
                  <div className="unit"><div className="num">{pad(t.j)}</div><div className="lbl">jours</div></div>
                  <div className="unit"><div className="num">{pad(t.h)}</div><div className="lbl">heures</div></div>
                  <div className="unit"><div className="num">{pad(t.m)}</div><div className="lbl">min</div></div>
                </div>
                <p className="muted small">avant la clôture · {formatDeadline(season)}</p>
              </>
            )}
          </div>
          <div className="bar">
            <span className="app-icon">🏆</span>
            <div className="grow">
              <div className="title">Mon classement {season}</div>
              <div className="sub">
                {filled === 20 ? "Complet · 20/20 athlètes" : filled ? `Incomplet · ${filled}/20 athlètes` : "Pas encore envoyé"}
              </div>
              <div className="progress" style={{ marginTop: 6, maxWidth: 220 }}>
                <span style={{ width: `${(filled / 20) * 100}%` }} />
              </div>
            </div>
            <Link href="/pronos" className="btn">
              {locked ? "Voir" : filled ? "Modifier" : "Jouer"}
            </Link>
          </div>
        </section>

        <div className="stack" style={{ gap: 22 }}>
          <section className="game theme-yellow">
            <div className="art" style={{ minHeight: 0 }}>
              <div className="kicker">Tu as un code ?</div>
              <h2 style={{ fontSize: "2.2rem", marginBottom: 12 }}>Rejoindre une ligue</h2>
              <InlineForm
                action={joinLeague}
                name="code"
                placeholder="ABCD"
                button="Go"
                extra={{ maxLength: 4, minLength: 4, className: "code-input", autoComplete: "off", autoCapitalize: "characters" }}
              />
            </div>
          </section>
          <section className="game theme-pitch">
            <div className="art" style={{ minHeight: 0 }}>
              <div className="kicker" style={{ color: "#c9f5d8" }}>Famille, potes, bureau…</div>
              <h2 style={{ fontSize: "2.2rem", marginBottom: 12 }}>Créer une ligue</h2>
              <InlineForm
                action={createLeague}
                name="name"
                placeholder="Famille Dupont"
                button="Créer"
                extra={{ maxLength: 40 }}
              />
            </div>
          </section>
        </div>
      </div>

      <div className="section-title">
        <h2 style={{ fontSize: "2.2rem" }}>Mes ligues</h2>
        <span className="kicker">{leagues.length} ligue{leagues.length > 1 ? "s" : ""}</span>
      </div>
      {leagues.length === 0 ? (
        <div className="empty">
          Tu n&apos;es dans aucune ligue pour l&apos;instant. Crée-en une ou entre le code à 4 lettres
          qu&apos;on t&apos;a envoyé.
        </div>
      ) : (
        <div className="grid2">
          {leagues.map((l, i) => (
            <Link key={l.id} href={`/ligue/${l.code}`} className={`league-tile game ${["theme-night dots", "theme-blue", "theme-pitch", "theme-yellow"][i % 4]}`}>
              <div className="art" style={{ minHeight: 150 }}>
                <div className="kicker">Ligue privée</div>
                <h2 style={{ fontSize: "2.3rem", maxWidth: "12ch" }}>{l.name}</h2>
                <div className="code-tiles small" style={{ position: "absolute", right: 22, bottom: 22 }}>
                  {l.code.split("").map((c, k) => <span key={k}>{c}</span>)}
                </div>
              </div>
              <div className="bar">
                <span className="app-icon">👥</span>
                <div className="grow">
                  <div className="title">{l.name}</div>
                  <div className="sub">{l.members} joueur{l.members > 1 ? "s" : ""}</div>
                </div>
                <span className="btn">Ouvrir</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyLeagues, getPredictions } from "@/lib/data";
import { currentSeason, deadline, isLocked, now } from "@/lib/season";
import { JoinCreate, LeagueTiles } from "./components/leagues";
import { Jersey } from "./components/jersey";

function countdown(season: number) {
  const ms = Math.max(0, deadline(season).getTime() - now().getTime());
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
  const filled = mine ? mine.monde.filter((x) => x.name).length + mine.france.filter((x) => x.name).length : 0;
  const t = countdown(season);

  return (
    <>
      <div className="hero-grid">
        <section className="game theme-night dots">
          <div className="art" style={{ paddingBottom: 26 }}>
            <div className="jersey-stack">
              <span className="float"><Jersey variant="rainbow" size={70} tilt={-12} number={1} /></span>
              <span className="float d2"><Jersey variant="yellow" size={86} number={1} /></span>
              <span className="float d3"><Jersey variant="blue" size={70} tilt={12} number={1} /></span>
            </div>
            <h1 style={{ maxWidth: "11ch", marginTop: 6, fontSize: user.display_name.length > 9 ? "clamp(1.7rem, 7.5vw, 2.6rem)" : undefined }}>
              {locked ? (
                <>Les jeux sont faits</>
              ) : (
                <>
                  Salut{" "}
                  <span className="nowrap">
                    {user.display_name}
                    <span style={{ color: "var(--yellow)" }}>{"\u00a0"}!</span>
                  </span>
                </>
              )}
            </h1>
            {locked ? (
              <p className="muted" style={{ marginTop: 14, maxWidth: "42ch" }}>
                Pronos fermés. Verdict fin décembre.
              </p>
            ) : (
              <>
                <div className="timer" aria-label="Temps restant">
                  <div className="unit"><div className="num">{pad(t.j)}</div><div className="lbl">jours</div></div>
                  <div className="unit"><div className="num">{pad(t.h)}</div><div className="lbl">heures</div></div>
                  <div className="unit"><div className="num">{pad(t.m)}</div><div className="lbl">min</div></div>
                </div>
                <p className="muted small">avant la clôture · 15 déc. 23h59</p>
              </>
            )}
          </div>
          <div className="bar">
            <span className="app-icon">🏆</span>
            <div className="grow">
              <div className="title">Mon classement</div>
              <div className="sub">
                {filled === 20 ? "Complet · 20/20" : filled ? `${filled}/20` : "Pas encore envoyé"}
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
          <JoinCreate />
        </div>
      </div>

      <div className="section-title">
        <h2 style={{ fontSize: "2.2rem" }}>Mes ligues</h2>
        <span className="kicker">{leagues.length} ligue{leagues.length > 1 ? "s" : ""}</span>
      </div>
      <LeagueTiles leagues={leagues} />
    </>
  );
}

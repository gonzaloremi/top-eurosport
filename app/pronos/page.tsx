import { requireUser } from "@/lib/auth";
import { getKnownAthletes, getPredictions } from "@/lib/data";
import { currentSeason, formatDeadline, isLocked, timeLeft } from "@/lib/season";
import { savePredictions } from "../actions";
import { Top10Form } from "../components/forms";

export default async function Pronos() {
  const user = await requireUser();
  const season = currentSeason();
  const locked = isLocked(season);
  const [preds, athletes] = await Promise.all([getPredictions([user.id], season), getKnownAthletes()]);
  const mine = preds.get(user.id) ?? { monde: Array(10).fill(""), france: Array(10).fill("") };

  return (
    <>
      <div className="section-title" style={{ marginTop: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div className="kicker">Saison {season}</div>
          <h1>Mon classement</h1>
        </div>
        {locked ? <span className="chip lock">🔒 Fermé</span> : <span className="chip wait">⏱ encore {timeLeft(season)}</span>}
      </div>
      <p className="muted" style={{ margin: "-4px 2px 20px", maxWidth: "70ch" }}>
        {locked
          ? "Les pronostics sont fermés depuis le 1er décembre. Voici ce que tu as envoyé."
          : `Classe les sportifs comme tu penses qu'Eurosport les classera. Modifiable jusqu'au ${formatDeadline(season)}. Ton classement compte dans toutes tes ligues et reste secret jusqu'à la clôture.`}
      </p>
      <Top10Form action={savePredictions} initial={mine} athletes={athletes} disabled={locked} submitLabel="Enregistrer mon classement" />
    </>
  );
}

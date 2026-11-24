import { requireUser } from "@/lib/auth";
import { getCatalogLite, getPredictions, emptySlots } from "@/lib/data";
import { currentSeason, formatDeadline, isLocked, timeLeft } from "@/lib/season";
import { proposeAthlete, savePredictions } from "../actions";
import { Top10Form } from "../components/forms";

export default async function Pronos() {
  const user = await requireUser();
  const season = currentSeason();
  const locked = isLocked(season);
  const [preds, catalogue] = await Promise.all([getPredictions([user.id], season), getCatalogLite()]);
  const mine = preds.get(user.id) ?? emptySlots();

  return (
    <>
      <div className="section-title" style={{ marginTop: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div className="kicker">Saison {season}</div>
          <h1>Mon classement</h1>
        </div>
        {locked ? <span className="chip lock">🔒 Fermé</span> : <span className="chip wait">⏱ encore {timeLeft(season)}</span>}
      </div>
      <p className="muted" style={{ margin: "-4px 2px 20px", maxWidth: "72ch" }}>
        {locked
          ? "Les pronostics sont fermés depuis le 15 décembre. Voici ce que tu as envoyé."
          : `Tape quelques lettres et choisis l'athlète dans la liste (les fautes sont tolérées). Quelqu'un manque ? Ajoute-le, l'admin vérifiera. Modifiable jusqu'au ${formatDeadline(season)} ; ton classement compte dans toutes tes ligues et reste secret jusqu'à la clôture.`}
      </p>
      <Top10Form
        action={savePredictions}
        propose={proposeAthlete}
        initial={mine}
        catalogue={catalogue}
        disabled={locked}
        submitLabel="Enregistrer mon classement"
      />
    </>
  );
}

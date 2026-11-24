import { requireUser } from "@/lib/auth";
import { getCatalogLite, getPredictions, emptySlots } from "@/lib/data";
import { currentSeason, isLocked, timeLeft } from "@/lib/season";
import { proposeAthlete, savePredictions } from "../actions";
import { Top10Form } from "../components/forms";

export default async function Pronos() {
  const user = await requireUser();
  const season = currentSeason();
  const locked = isLocked(season);
  const [preds, catalogue] = await Promise.all([getPredictions([user.id], season), getCatalogLite(user)]);
  const mine = preds.get(user.id) ?? emptySlots();

  return (
    <>
      <div className="section-title" style={{ marginTop: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <h1>Mon classement</h1>
        </div>
        {locked ? <span className="chip lock">🔒 Fermé</span> : <span className="chip wait">⏱ encore {timeLeft(season)}</span>}
      </div>
      <p className="muted" style={{ margin: "-4px 2px 18px" }}>
        {locked
          ? "Fermé. Voici ton classement."
          : "Tape un nom, choisis. Glisse ⠿ pour réordonner. Secret jusqu'au 15 déc."}
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

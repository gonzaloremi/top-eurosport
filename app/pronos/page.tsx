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
      <h1>Mon classement {season}</h1>
      {locked ? (
        <p className="alert error">
          🔒 Les pronostics sont fermés depuis le 1er décembre. Voici ce que tu as envoyé.
        </p>
      ) : (
        <p className="muted">
          Classe les 10 sportifs du top Monde et du top France tels que tu penses
          qu&apos;Eurosport les classera. Modifiable jusqu&apos;au {formatDeadline(season)} (encore{" "}
          {timeLeft(season)}). Ton classement est le même dans toutes tes ligues et reste caché aux
          autres jusqu&apos;à la date limite.
        </p>
      )}
      <Top10Form
        action={savePredictions}
        initial={mine}
        athletes={athletes}
        disabled={locked}
        submitLabel="Enregistrer mon classement"
      />
    </>
  );
}

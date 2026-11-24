import { requireUser } from "@/lib/auth";
import { getMyLeagues } from "@/lib/data";
import { JoinCreate, LeagueTiles } from "../components/leagues";

export default async function MesLigues() {
  const user = await requireUser();
  const leagues = await getMyLeagues(user.id);
  return (
    <>
      <div className="section-title" style={{ marginTop: 6 }}>
        <h1>Mes ligues</h1>
        <span className="kicker">{leagues.length} ligue{leagues.length > 1 ? "s" : ""}</span>
      </div>
      <LeagueTiles leagues={leagues} />
      <div className="grid2">
        <JoinCreate />
      </div>
    </>
  );
}

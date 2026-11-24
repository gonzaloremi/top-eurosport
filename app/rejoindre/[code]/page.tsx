import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLeague, getMembers } from "@/lib/data";
import { joinLeague } from "../../actions";
import { InlineForm } from "../../components/forms";

export default async function Rejoindre({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const league = await getLeague(code);
  if (!league) notFound();
  const user = await getUser();
  if (!user) redirect(`/connexion?mode=inscription&next=/rejoindre/${league.code}`);
  const members = await getMembers(league.id);
  if (members.some((m) => m.id === user.id)) redirect(`/ligue/${league.code}`);
  return (
    <section className="game theme-night dots" style={{ maxWidth: 520, margin: "10px auto 22px" }}>
      <div className="art" style={{ textAlign: "center", paddingTop: 34 }}>
        <div className="kicker">Tu es invité·e dans la ligue</div>
        <h1 style={{ margin: "8px 0 18px" }}>{league.name}</h1>
        <div className="code-tiles" style={{ justifyContent: "center", marginBottom: 18 }}>
          {league.code.split("").map((c, i) => <span key={i}>{c}</span>)}
        </div>
        <p className="muted">{members.map((m) => m.display_name).join(", ")} t&apos;attendent !</p>
      </div>
      <div className="bar" style={{ justifyContent: "center" }}>
        <InlineForm
          action={joinLeague}
          name="code"
          placeholder="ABCD"
          button="Rejoindre la ligue"
          extra={{ defaultValue: league.code, readOnly: true, type: "hidden" }}
        />
      </div>
    </section>
  );
}

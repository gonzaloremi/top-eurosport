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
    <section className="card" style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <p className="muted">Tu es invité·e dans la ligue</p>
      <h1>{league.name}</h1>
      <p className="muted">
        {members.map((m) => m.display_name).join(", ")} t&apos;attendent !
      </p>
      <div style={{ marginTop: 16 }}>
        <InlineForm
          action={joinLeague}
          name="code"
          placeholder="ABCD"
          button="Rejoindre la ligue"
          extra={{ defaultValue: league.code, readOnly: true, className: "code-input" }}
        />
      </div>
    </section>
  );
}

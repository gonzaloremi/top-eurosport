import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { login, register } from "../actions";
import { AuthForm } from "../components/forms";
import { Jersey } from "../components/jersey";

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const { mode, next = "/" } = await searchParams;
  if (await getUser()) redirect(next.startsWith("/") ? next : "/");
  const isRegister = mode === "inscription";
  const q = (m?: string) =>
    `/connexion?${new URLSearchParams({ ...(m ? { mode: m } : {}), ...(next !== "/" ? { next } : {}) })}`;
  return (
    <div className="hero-grid" style={{ alignItems: "start" }}>
      <section className="game theme-night dots">
        <div className="art" style={{ minHeight: 360, paddingBottom: 30 }}>
          <div className="kicker">Le jeu de fin d&apos;année</div>
          <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 4.4rem)", marginTop: 8, maxWidth: "9ch" }}>
            Devine le <span style={{ color: "var(--yellow)" }}>top 10</span> de l&apos;année
          </h1>
          <p className="muted" style={{ marginTop: 14, maxWidth: "38ch" }}>
            Classe les 10 sportifs Monde et France de l&apos;année. Verdict Eurosport fin décembre.
          </p>
          <div className="row" style={{ marginTop: 26, gap: 4, alignItems: "flex-end" }}>
            <span className="float"><Jersey variant="rainbow" size={84} tilt={-10} number="M" /></span>
            <span className="float d2"><Jersey variant="yellow" size={104} number="1" /></span>
            <span className="float d3"><Jersey variant="blue" size={84} tilt={10} number="F" /></span>
          </div>
        </div>
        <div className="bar">
          <span className="app-icon">🏁</span>
          <div className="grow">
            <div className="title">3 maillots à gagner</div>
            <div className="sub">Arc-en-ciel · Bleu · Jaune</div>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="tabs">
          <Link href={q()} className={!isRegister ? "active" : ""}>
            Connexion
          </Link>
          <Link href={q("inscription")} className={isRegister ? "active" : ""}>
            Créer un compte
          </Link>
        </div>
        {isRegister ? (
          <AuthForm key="r" action={register} mode="register" next={next} />
        ) : (
          <AuthForm key="l" action={login} mode="login" next={next} />
        )}
      </section>
    </div>
  );
}

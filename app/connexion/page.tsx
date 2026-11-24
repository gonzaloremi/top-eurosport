import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { login, register } from "../actions";
import { AuthForm } from "../components/forms";

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
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <section className="hero">
        <h1>Devine les tops 10 de l&apos;année</h1>
        <p className="muted">
          Classe les 10 meilleurs sportifs Monde et France de l&apos;année avant le 1er décembre,
          puis compare-toi à ta famille et tes amis quand Eurosport publie ses tops 10.
        </p>
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

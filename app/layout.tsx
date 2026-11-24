import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "./actions";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top 10 de l'année",
  description: "Devine les tops 10 Eurosport France et Monde de l'année entre amis et en famille.",
};
export const viewport: Viewport = { themeColor: "#0b1530", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="fr">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="logo">10</span>
            <span>Top 10 de l&apos;année</span>
          </Link>
          {user && (
            <nav>
              <Link href="/pronos">Mon prono</Link>
              {user.is_admin && <Link href="/admin">Admin</Link>}
              <form action={logout}>
                <button className="linklike" title={`Connecté : ${user.display_name}`}>
                  Déconnexion
                </button>
              </form>
            </nav>
          )}
        </header>
        <main>{children}</main>
        <footer>
          3 pts = bon athlète à la bonne place · 1 pt = dans le top 10 mais mal placé ·{" "}
          <Link href="/regles">Règles</Link> · <Link href="/palmares">Palmarès</Link>
        </footer>
      </body>
    </html>
  );
}

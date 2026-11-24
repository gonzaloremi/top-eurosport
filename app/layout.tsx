import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "./actions";
import { InstallPrompt } from "./components/install-prompt";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top 10 de l'année",
  description: "Devine les tops 10 Eurosport France et Monde de l'année entre amis et en famille.",
  appleWebApp: { capable: true, title: "Top10", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#eceae4", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body>
        <header className="topbar">
          <Link href="/" className="wordmark">
            <span className="mark">Top10<span className="dot">.</span></span>
          </Link>
          {user && (
            <nav>
              <Link href="/pronos" className="pill">
                Mes pronos
              </Link>
              <Link href="/palmares" className="pill">
                Palmarès
              </Link>
              {user.is_admin && (
                <Link href="/admin" className="pill">
                  Admin
                </Link>
              )}
              <form action={logout}>
                <button className="pill ghost" title="Se déconnecter" aria-label={`Se déconnecter (${user.display_name})`}>
                  {user.display_name}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                    <path d="M12 3v8" />
                    <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
                  </svg>
                </button>
              </form>
            </nav>
          )}
        </header>
        <main>{children}</main>
        <footer>
          <span>
            <b>3 pts</b> bonne place · <b>1 pt</b> dans le top 10 mal placé
          </span>
          <span>
            <Link href="/regles">Règles</Link> · <Link href="/palmares">Palmarès</Link>
          </span>
        </footer>
        <InstallPrompt />
      </body>
    </html>
  );
}

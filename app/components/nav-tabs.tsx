"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/ligues", label: "Mes ligues", short: "Ligues", match: (p: string) => p.startsWith("/ligue") },
    { href: "/pronos", label: "Mes pronos", short: "Pronos", match: (p: string) => p.startsWith("/pronos") },
    { href: "/palmares", label: "Palmarès", short: "Palmarès", match: (p: string) => p.startsWith("/palmares") },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", short: "Admin", match: (p: string) => p.startsWith("/admin") }] : []),
  ];
  return (
    <nav className="tabs-nav" aria-label="Navigation">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={t.match(path) ? "active" : ""}>
          <span className="l-full">{t.label}</span>
          <span className="l-short">{t.short}</span>
        </Link>
      ))}
    </nav>
  );
}

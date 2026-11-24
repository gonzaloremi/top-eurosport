export type Category = "monde" | "france";
export const CATEGORIES: Category[] = ["monde", "france"];
export const CATEGORY_LABEL: Record<Category, string> = {
  monde: "Top 10 Monde",
  france: "Top 10 France",
};

/** Horloge (TOP10_FAKE_NOW permet de simuler une date en test ; jamais défini en production). */
export function now(): Date {
  const fake = typeof process !== "undefined" ? process.env.TOP10_FAKE_NOW : undefined;
  return fake ? new Date(fake) : new Date();
}

/** Saison en cours = année civile (heure de Paris), janvier compris dans la saison précédente. */
export function currentSeason(now_ = now()): number {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "numeric" })
    .format(now_)
    .split("-")
    .map(Number);
  // En janvier on reste sur la saison précédente (verdict Eurosport de fin décembre)
  return m === 1 ? y - 1 : y;
}

/** Date limite : 15 décembre 23:59, heure de Paris (UTC+1 en hiver) — avant le début du compte à rebours Eurosport. */
export function deadline(season: number): Date {
  return new Date(Date.UTC(season, 11, 15, 23, 0, 0));
}

export function isLocked(season: number, at = now()): boolean {
  return at.getTime() >= deadline(season).getTime();
}

export function formatDeadline(season: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(deadline(season).getTime() - 60_000));
}

export function timeLeft(season: number, at = now()): string {
  const ms = deadline(season).getTime() - at.getTime();
  if (ms <= 0) return "Pronostics fermés";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

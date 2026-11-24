/** Utilitaires partagés client/serveur : normalisation, recherche floue, drapeaux. */

/** Lettres qui ne se décomposent pas en NFD (æ, ø, œ, ß, ł…). */
const SPECIAL: Record<string, string> = {
  æ: "ae", Æ: "ae", ø: "o", Ø: "o", œ: "oe", Œ: "oe", ß: "ss", ł: "l", Ł: "l",
  đ: "d", Đ: "d", ð: "d", Ð: "d", þ: "th", Þ: "th", ı: "i",
};
function fold(s: string): string {
  return s.replace(/[æÆøØœŒßłŁđĐðÐþÞı]/g, (c) => SPECIAL[c] ?? c);
}

export function normalize(name: string): string {
  return fold(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Tokens normalisés : "Ferrand-Prévost" -> ["ferrand","prevost","ferrandprevost"] */
export function tokens(name: string): string[] {
  const parts = fold(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const joined = parts.join("");
  return parts.length > 1 ? [...parts, joined] : parts;
}

/** Distance de Damerau-Levenshtein (transpositions comprises). */
export function distance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

function tolerance(len: number) {
  return len >= 7 ? 2 : len >= 4 ? 1 : 0;
}

/** Score d'un token de requête contre un token d'athlète (0 = pas de correspondance). */
function tokenScore(q: string, t: string): number {
  if (t === q) return 5;
  if (t.startsWith(q)) return 4;
  if (q.length >= 3 && t.includes(q)) return 2;
  const tol = tolerance(q.length);
  if (!tol) return 0;
  // faute de frappe : compare au mot entier, ou à son début de même longueur (saisie en cours)
  if (distance(q, t) <= tol) return 3;
  if (t.length > q.length && distance(q, t.slice(0, q.length)) <= tol) return 1.5;
  return 0;
}

/** Score global d'un nom pour une requête ; 0 = exclu. */
export function matchScore(query: string, name: string): number {
  const qs = tokens(query);
  if (qs.length === 0) return 0;
  const ts = tokens(name);
  let total = 0;
  for (const q of qs.length > 1 ? qs.slice(0, -1) : qs) {
    let best = 0;
    for (const t of ts) best = Math.max(best, tokenScore(q, t));
    if (best === 0) {
      // dernière chance : requête collée ("mcintosh", "vanderpoel")
      const full = normalize(name);
      const qq = normalize(query);
      if (qq.length >= 4 && (full.includes(qq) || distance(qq, full) <= tolerance(qq.length))) return 2;
      return 0;
    }
    total += best;
  }
  return total;
}

export type Lite = {
  id: number;
  n: string; // nom affiché
  s: string; // sport
  g: string; // M / F
  c: string; // pays ISO
  i: boolean; // candidat international
  f: boolean; // candidat France
  p: boolean; // en attente de validation
  l?: string; // nom de famille (pour l'affichage abrégé)
};

/** Nom affichable dans une tuile étroite : « J. H. Klæbo », « Fournier Beaudry & Cizeron ». */
export function shortName(full: string, last?: string, max = 21): string {
  if (full.length <= max) return full;
  if (full.includes(" & ")) {
    // duo : on garde les noms de famille (tout sauf le premier mot de chaque côté)
    return full
      .split(" & ")
      .map((p) => {
        const w = p.trim().split(/\s+/);
        return w.length > 1 ? w.slice(1).join(" ") : p.trim();
      })
      .join(" & ");
  }
  if (last && full.endsWith(last) && full.length > last.length) {
    const first = full.slice(0, full.length - last.length).trim();
    const initials = first
      .split(/[\s]+/)
      .filter(Boolean)
      .map((w) => w.split("-").map((x) => x[0] + ".").join("-"))
      .join(" ");
    return `${initials} ${last}`;
  }
  return full;
}

export function search(list: Lite[], query: string, opts: { franceOnly?: boolean; limit?: number } = {}) {
  const pool = opts.franceOnly ? list.filter((a) => a.c === "FR") : list;
  const q = query.trim();
  if (!q) return [];
  return pool
    .map((a) => ({ a, score: Math.max(matchScore(q, a.n), matchScore(q, a.s) > 4 ? 0.5 : 0) }))
    .filter((x) => x.score > 0)
    .sort(
      (x, y) =>
        y.score - x.score ||
        Number(opts.franceOnly ? y.a.f : y.a.i) - Number(opts.franceOnly ? x.a.f : x.a.i) ||
        Number(x.a.p) - Number(y.a.p) ||
        x.a.n.localeCompare(y.a.n, "fr")
    )
    .slice(0, opts.limit ?? 8)
    .map((x) => x.a);
}

export function flag(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return "🏳️";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function genderLabel(g: string): string {
  return g === "F" ? "F" : g === "X" ? "Duo" : "H";
}

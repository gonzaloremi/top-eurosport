/** Chemin de retour interne uniquement (évite les redirections vers un autre site). */
export function safeNext(n: unknown): string {
  return typeof n === "string" && /^\/(?![\/\\])/.test(n) ? n : "/";
}

"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, ensureSchema } from "@/lib/db";
import { createSession, destroySession, requireUser, requireAdmin } from "@/lib/auth";
import { CATEGORIES, currentSeason, isLocked, type Category } from "@/lib/season";
import { normalize } from "@/lib/scoring";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- Comptes ----------

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  await ensureSchema();
  const displayName = str(fd, "name");
  const username = displayName.toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  if (displayName.length < 2 || displayName.length > 30)
    return { error: "Le pseudo doit faire entre 2 et 30 caractères." };
  if (password.length < 4) return { error: "Mot de passe trop court (4 caractères minimum)." };
  const [exists] = await sql`SELECT 1 FROM users WHERE username = ${username}`;
  if (exists) return { error: "Ce pseudo est déjà pris." };
  const hash = await bcrypt.hash(password, 10);
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
  const [user] = await sql`
    INSERT INTO users (username, display_name, password_hash, is_admin)
    VALUES (${username}, ${displayName}, ${hash}, ${count === 0})
    RETURNING id`;
  await createSession(user.id);
  redirect(next);
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  await ensureSchema();
  const username = str(fd, "name").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  const [user] = await sql`SELECT id, password_hash FROM users WHERE username = ${username}`;
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return { error: "Pseudo ou mot de passe incorrect." };
  await createSession(user.id);
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/connexion");
}

function safeNext(n: string) {
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

// ---------- Ligues ----------

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I ni O pour éviter les confusions

export async function createLeague(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 40) return { error: "Nom de ligue : 2 à 40 caractères." };
  let code = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
    const [taken] = await sql`SELECT 1 FROM leagues WHERE code = ${code}`;
    if (!taken) break;
  }
  const [league] = await sql`
    INSERT INTO leagues (name, code, owner_id) VALUES (${name}, ${code}, ${user.id}) RETURNING id`;
  await sql`INSERT INTO league_members (league_id, user_id) VALUES (${league.id}, ${user.id})`;
  redirect(`/ligue/${code}`);
}

export async function joinLeague(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = str(fd, "code").toUpperCase().replace(/[^A-Z]/g, "");
  if (code.length !== 4) return { error: "Le code fait 4 lettres." };
  const [league] = await sql`SELECT id FROM leagues WHERE code = ${code}`;
  if (!league) return { error: `Aucune ligue avec le code ${code}.` };
  await sql`INSERT INTO league_members (league_id, user_id) VALUES (${league.id}, ${user.id})
            ON CONFLICT DO NOTHING`;
  redirect(`/ligue/${code}`);
}

export async function leaveLeague(fd: FormData) {
  const user = await requireUser();
  const code = str(fd, "code").toUpperCase();
  const [league] = await sql`SELECT id, owner_id FROM leagues WHERE code = ${code}`;
  if (!league) redirect("/");
  await sql`DELETE FROM league_members WHERE league_id = ${league.id} AND user_id = ${user.id}`;
  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM league_members WHERE league_id = ${league.id}`;
  if (count === 0) await sql`DELETE FROM leagues WHERE id = ${league.id}`;
  redirect("/");
}

// ---------- Pronostics ----------

function readTop10(fd: FormData, prefix: string): string[] {
  return Array.from({ length: 10 }, (_, i) =>
    str(fd, `${prefix}-${i + 1}`).replace(/\s+/g, " ").slice(0, 60)
  );
}

function checkDuplicates(list: string[], label: string): string | null {
  const seen = new Map<string, number>();
  for (let i = 0; i < list.length; i++) {
    const k = normalize(list[i]);
    if (!k) continue;
    if (seen.has(k)) return `${label} : « ${list[i]} » apparaît deux fois (places ${seen.get(k)! + 1} et ${i + 1}).`;
    seen.set(k, i);
  }
  return null;
}

export async function savePredictions(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const season = currentSeason();
  if (isLocked(season)) return { error: "Trop tard ! Les pronostics sont fermés depuis le 1er décembre." };
  const lists: Record<Category, string[]> = {
    monde: readTop10(fd, "monde"),
    france: readTop10(fd, "france"),
  };
  for (const c of CATEGORIES) {
    const dup = checkDuplicates(lists[c], c === "monde" ? "Top Monde" : "Top France");
    if (dup) return { error: dup };
  }
  await sql.begin(async (tx) => {
    await tx`DELETE FROM predictions WHERE user_id = ${user.id} AND season = ${season}`;
    for (const c of CATEGORIES) {
      for (let i = 0; i < 10; i++) {
        if (!lists[c][i]) continue;
        await tx`INSERT INTO predictions (user_id, season, category, position, athlete)
                 VALUES (${user.id}, ${season}, ${c}, ${i + 1}, ${lists[c][i]})`;
      }
    }
  });
  revalidatePath("/", "layout");
  const missing = CATEGORIES.reduce((n, c) => n + lists[c].filter((a) => !a).length, 0);
  return {
    ok: missing
      ? `Enregistré ✔︎ — il te reste ${missing} case(s) vide(s), tu peux revenir compléter jusqu'au 30 novembre.`
      : "Classement enregistré ✔︎ Tu peux encore le modifier jusqu'au 30 novembre minuit.",
  };
}

// ---------- Admin : résultats officiels ----------

export async function saveResults(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const season = Number(str(fd, "season"));
  if (!Number.isInteger(season) || season < 2000 || season > 2100) return { error: "Saison invalide." };
  const lists: Record<Category, string[]> = {
    monde: readTop10(fd, "monde"),
    france: readTop10(fd, "france"),
  };
  for (const c of CATEGORIES) {
    const dup = checkDuplicates(lists[c], c === "monde" ? "Top Monde" : "Top France");
    if (dup) return { error: dup };
  }
  await sql.begin(async (tx) => {
    await tx`DELETE FROM results WHERE season = ${season}`;
    for (const c of CATEGORIES)
      for (let i = 0; i < 10; i++)
        if (lists[c][i])
          await tx`INSERT INTO results (season, category, position, athlete)
                   VALUES (${season}, ${c}, ${i + 1}, ${lists[c][i]})`;
  });
  revalidatePath("/", "layout");
  return { ok: `Top 10 officiels ${season} enregistrés ✔︎` };
}

export async function saveAlias(fd: FormData) {
  await requireAdmin();
  const season = Number(str(fd, "season"));
  const from = normalize(str(fd, "from"));
  const to = normalize(str(fd, "to"));
  if (!from) redirect(`/admin?saison=${season}`);
  if (!to || to === from) await sql`DELETE FROM aliases WHERE season = ${season} AND from_key = ${from}`;
  else
    await sql`INSERT INTO aliases (season, from_key, to_key) VALUES (${season}, ${from}, ${to})
              ON CONFLICT (season, from_key) DO UPDATE SET to_key = EXCLUDED.to_key`;
  revalidatePath("/", "layout");
  redirect(`/admin?saison=${season}`);
}

export async function setAdmin(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "userId"));
  const value = str(fd, "value") === "1";
  await sql`UPDATE users SET is_admin = ${value} WHERE id = ${id}`;
  redirect("/admin");
}

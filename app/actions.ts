"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, ensureSchema } from "@/lib/db";
import { createSession, destroySession, requireUser, requireAdmin } from "@/lib/auth";
import { CATEGORIES, currentSeason, isLocked, type Category } from "@/lib/season";
import { normalize, type Lite } from "@/lib/search";
import { displayName, insertAthlete, mergeAthletes, toLite } from "@/lib/athletes";

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

type SlotIn = { id: number | null; name: string };

async function readSlots(fd: FormData, prefix: string): Promise<SlotIn[] | string> {
  const raw = Array.from({ length: 10 }, (_, i) => str(fd, `${prefix}-${i + 1}`));
  const ids = raw.filter((v) => /^\d+$/.test(v)).map(Number);
  const rows = ids.length
    ? await sql`SELECT id, display_name FROM athletes WHERE id = ANY(${ids})`
    : [];
  const names = new Map(rows.map((r) => [r.id as number, r.display_name as string]));
  const out: SlotIn[] = [];
  for (const v of raw) {
    if (!v) out.push({ id: null, name: "" });
    else if (/^\d+$/.test(v)) {
      const name = names.get(Number(v));
      if (!name) return "Un des athlètes choisis n'existe plus, recharge la page.";
      out.push({ id: Number(v), name });
    } else if (v.startsWith("txt:")) out.push({ id: null, name: v.slice(4).slice(0, 60) });
    else return "Valeur invalide.";
  }
  return out;
}

function checkDuplicates(list: SlotIn[], label: string): string | null {
  const seen = new Map<string, number>();
  for (let i = 0; i < list.length; i++) {
    const k = list[i].id ? `a${list[i].id}` : normalize(list[i].name) ? `t${normalize(list[i].name)}` : "";
    if (!k) continue;
    if (seen.has(k)) return `${label} : « ${list[i].name} » apparaît deux fois (places ${seen.get(k)! + 1} et ${i + 1}).`;
    seen.set(k, i);
  }
  return null;
}

async function readBoth(fd: FormData) {
  const monde = await readSlots(fd, "monde");
  if (typeof monde === "string") return monde;
  const france = await readSlots(fd, "france");
  if (typeof france === "string") return france;
  const lists: Record<Category, SlotIn[]> = { monde, france };
  for (const c of CATEGORIES) {
    const dup = checkDuplicates(lists[c], c === "monde" ? "Top Monde" : "Top France");
    if (dup) return dup;
  }
  return lists;
}

export async function savePredictions(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const season = currentSeason();
  if (isLocked(season)) return { error: "Trop tard ! Les pronostics sont fermés depuis le 1er décembre." };
  const lists = await readBoth(fd);
  if (typeof lists === "string") return { error: lists };
  await sql.begin(async (tx) => {
    await tx`DELETE FROM predictions WHERE user_id = ${user.id} AND season = ${season}`;
    for (const c of CATEGORIES)
      for (let i = 0; i < 10; i++) {
        const s = lists[c][i];
        if (!s.name) continue;
        await tx`INSERT INTO predictions (user_id, season, category, position, athlete, athlete_id)
                 VALUES (${user.id}, ${season}, ${c}, ${i + 1}, ${s.name}, ${s.id})`;
      }
  });
  revalidatePath("/", "layout");
  const missing = CATEGORIES.reduce((n, c) => n + lists[c].filter((a) => !a.name).length, 0);
  const vague = CATEGORIES.reduce((n, c) => n + lists[c].filter((a) => a.name && !a.id).length, 0);
  return {
    ok: vague
      ? `Enregistré ✔︎ — ${vague} nom(s) marqué(s) ⚠️ à préciser : choisis-les dans la liste pour être sûr que ça compte.`
      : missing
        ? `Enregistré ✔︎ — il te reste ${missing} case(s) vide(s), tu peux revenir compléter jusqu'au 30 novembre.`
        : "Classement enregistré ✔︎ Tu peux encore le modifier jusqu'au 30 novembre minuit.",
  };
}

// ---------- Catalogue d'athlètes ----------

export type ProposeResult = { error?: string; athlete?: Lite };

export async function proposeAthlete(fd: FormData): Promise<ProposeResult> {
  const user = await requireUser();
  const first = str(fd, "first_name").slice(0, 40);
  const last = str(fd, "last_name").slice(0, 40);
  const sport = str(fd, "sport").slice(0, 40);
  const gender = str(fd, "gender") === "F" ? "F" : "M";
  const country = str(fd, "country").toUpperCase();
  if (last.length < 2) return { error: "Indique au moins le nom de famille." };
  if (sport.length < 2) return { error: "Indique le sport." };
  if (!/^[A-Z]{2}$/.test(country)) return { error: "Pays invalide." };
  const a = await insertAthlete({
    first_name: first, last_name: last, sport, gender, country,
    in_intl: country !== "FR", in_fr: country === "FR",
    status: user.is_admin ? "approved" : "pending", created_by: user.id,
  });
  revalidatePath("/admin");
  return { athlete: toLite(a) };
}

// ---------- Admin : résultats officiels ----------

export async function saveResults(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const season = Number(str(fd, "season"));
  if (!Number.isInteger(season) || season < 2000 || season > 2100) return { error: "Saison invalide." };
  const lists = await readBoth(fd);
  if (typeof lists === "string") return { error: lists };
  await sql.begin(async (tx) => {
    await tx`DELETE FROM results WHERE season = ${season}`;
    for (const c of CATEGORIES)
      for (let i = 0; i < 10; i++) {
        const s = lists[c][i];
        if (s.name)
          await tx`INSERT INTO results (season, category, position, athlete, athlete_id)
                   VALUES (${season}, ${c}, ${i + 1}, ${s.name}, ${s.id})`;
      }
  });
  revalidatePath("/", "layout");
  return { ok: `Top 10 officiels ${season} enregistrés ✔︎` };
}

export async function approveAthlete(fd: FormData) {
  await requireAdmin();
  await sql`UPDATE athletes SET status = 'approved' WHERE id = ${Number(str(fd, "id"))}`;
  revalidatePath("/", "layout");
  redirect("/admin#revue");
}

export async function editAthlete(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const first = str(fd, "first_name").slice(0, 40);
  const last = str(fd, "last_name").slice(0, 40);
  if (id && last.length >= 2) {
    const display = displayName(first, last);
    await sql`UPDATE athletes SET first_name = ${first}, last_name = ${last}, display_name = ${display},
              search_key = ${normalize(display)}, last_key = ${normalize(last)}, status = 'approved'
              WHERE id = ${id}`;
    await sql`UPDATE predictions SET athlete = ${display} WHERE athlete_id = ${id}`;
    await sql`UPDATE results SET athlete = ${display} WHERE athlete_id = ${id}`;
  }
  revalidatePath("/", "layout");
  redirect("/admin#revue");
}

export async function mergeAthlete(fd: FormData) {
  await requireAdmin();
  const from = Number(str(fd, "from"));
  const to = Number(str(fd, "to"));
  if (from && to) await mergeAthletes(from, to);
  revalidatePath("/", "layout");
  redirect("/admin#revue");
}

export async function deleteAthlete(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const [used] = await sql`
    SELECT 1 FROM predictions WHERE athlete_id = ${id} UNION SELECT 1 FROM results WHERE athlete_id = ${id} LIMIT 1`;
  if (!used) await sql`DELETE FROM athletes WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/admin/catalogue");
}

/** Rattache un nom saisi en texte libre (anciens pronos) à un athlète du catalogue. */
export async function linkLegacy(fd: FormData) {
  await requireAdmin();
  const text = str(fd, "text");
  const id = Number(str(fd, "athlete_id"));
  if (!text || !id) redirect("/admin#revue");
  const [a] = await sql`SELECT display_name FROM athletes WHERE id = ${id}`;
  if (a) {
    await sql`UPDATE predictions SET athlete_id = ${id}, athlete = ${a.display_name} WHERE athlete_id IS NULL AND athlete = ${text}`;
    await sql`UPDATE results SET athlete_id = ${id}, athlete = ${a.display_name} WHERE athlete_id IS NULL AND athlete = ${text}`;
  }
  revalidatePath("/", "layout");
  redirect("/admin#revue");
}

export async function setAdmin(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "userId"));
  const value = str(fd, "value") === "1";
  await sql`UPDATE users SET is_admin = ${value} WHERE id = ${id}`;
  redirect("/admin");
}

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { sql, ensureSchema } from "./db";

const COOKIE = "top10_session";
let cachedSecret: Uint8Array | null = null;

async function getSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Pas de variable d'env : on génère un secret une fois et on le garde en base.
    await ensureSchema();
    const candidate = randomBytes(32).toString("hex");
    await sql`INSERT INTO settings (key, value) VALUES ('session_secret', ${candidate})
              ON CONFLICT (key) DO NOTHING`;
    const [row] = await sql`SELECT value FROM settings WHERE key = 'session_secret'`;
    secret = row.value as string;
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(await getSecret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type User = { id: number; username: string; display_name: string; is_admin: boolean };

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let uid: number;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    uid = Number(payload.uid);
  } catch {
    return null; // jeton invalide ou expiré
  }
  // Les erreurs base de données remontent (page d'erreur) au lieu de déconnecter tout le monde
  await ensureSchema();
  const [user] = await sql<User[]>`
    SELECT id, username, display_name, is_admin FROM users WHERE id = ${uid}`;
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/");
  return user;
}

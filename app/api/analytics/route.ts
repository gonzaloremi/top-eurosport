import { createHash, timingSafeEqual } from "crypto";
import { sql, ensureSchema } from "@/lib/db";
import { ANALYTICS_DOC, readerClient } from "@/lib/analytics";

export const dynamic = "force-dynamic";
const MAX_ROWS = 2000;

async function authorized(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  await ensureSchema();
  const [row] = await sql`SELECT value FROM settings WHERE key = 'analytics_token_hash'`;
  if (!row) return false;
  const a = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const b = Buffer.from(row.value as string);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** GET : description des vues disponibles. */
export async function GET(req: Request) {
  if (!(await authorized(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ schema: "analytics", views: ANALYTICS_DOC, usage: "POST {\"sql\": \"SELECT ...\"}" });
}

/** POST {sql} : requête SQL en lecture seule sur le schéma analytics. */
export async function POST(req: Request) {
  if (!(await authorized(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  let query = "";
  try {
    query = String((await req.json()).sql ?? "").trim().replace(/;\s*$/, "");
  } catch {
    return Response.json({ error: "body must be JSON {sql}" }, { status: 400 });
  }
  if (!query) return Response.json({ error: "empty sql" }, { status: 400 });
  if (query.includes(";")) return Response.json({ error: "one statement only" }, { status: 400 });
  try {
    const reader = await readerClient(sql);
    // Une seule requête SELECT, bornée : enveloppée dans une sous-requête avec LIMIT
    const rows = await reader.begin("read only", async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = '5s'`);
      return tx.unsafe(`SELECT * FROM (${query}) AS q LIMIT ${MAX_ROWS + 1}`);
    });
    const list = Array.from(rows as unknown as Record<string, unknown>[]);
    return Response.json({
      rowCount: Math.min(list.length, MAX_ROWS),
      truncated: list.length > MAX_ROWS,
      columns: list[0] ? Object.keys(list[0]) : [],
      rows: list.slice(0, MAX_ROWS),
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

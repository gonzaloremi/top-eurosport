import postgres from "postgres";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const isLocal = /localhost|127\.0\.0\.1/.test(url);

const g = globalThis as unknown as {
  _sql?: postgres.Sql;
  _schema?: Promise<void>;
};

export const sql: postgres.Sql =
  g._sql ??
  (g._sql = postgres(url, {
    ssl: isLocal ? false : "require",
    prepare: false,
    max: 5,
    idle_timeout: 20,
    onnotice: () => {},
  }));

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code CHAR(4) UNIQUE NOT NULL,
      owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS league_members (
      league_id INT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (league_id, user_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS predictions (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      season INT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('monde','france')),
      position INT NOT NULL CHECK (position BETWEEN 1 AND 10),
      athlete TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, season, category, position)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS results (
      season INT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('monde','france')),
      position INT NOT NULL CHECK (position BETWEEN 1 AND 10),
      athlete TEXT NOT NULL,
      PRIMARY KEY (season, category, position)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS aliases (
      season INT NOT NULL,
      from_key TEXT NOT NULL,
      to_key TEXT NOT NULL,
      PRIMARY KEY (season, from_key)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`;
}

/** Creates tables on first use (idempotent), once per server instance. */
export function ensureSchema(): Promise<void> {
  if (!g._schema) {
    g._schema = createSchema().catch((e) => {
      g._schema = undefined;
      throw e;
    });
  }
  return g._schema;
}

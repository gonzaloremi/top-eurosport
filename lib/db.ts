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

export type Db = postgres.Sql;

async function createSchema(sql: Db) {
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
    CREATE TABLE IF NOT EXISTS athletes (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      search_key TEXT NOT NULL,
      last_key TEXT NOT NULL,
      sport TEXT NOT NULL,
      gender CHAR(1) NOT NULL DEFAULT 'M',
      country CHAR(2) NOT NULL DEFAULT 'FR',
      in_intl BOOLEAN NOT NULL DEFAULT FALSE,
      in_fr BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending')),
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (search_key, sport)
    )`;
  // ALTER seulement si nécessaire (un ALTER verrouille la table même quand la colonne existe)
  for (const table of ["predictions", "results"]) {
    const [col] = await sql`SELECT 1 FROM information_schema.columns
                            WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = 'athlete_id'`;
    if (!col)
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN athlete_id INT REFERENCES athletes(id) ON DELETE SET NULL`);
  }
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`;
}

const BOOT_REV = "4"; // à incrémenter quand le schéma ou la logique d'initialisation change

/**
 * Initialise la base au premier accès de chaque instance serveur (idempotent).
 * Chemin rapide : rien à faire si la version de boot est déjà en base.
 * Sinon tout se fait dans une transaction protégée par un verrou, pour que deux démarrages simultanés
 * ne se marchent pas dessus.
 */
export function ensureSchema(): Promise<void> {
  if (!g._schema) {
    g._schema = boot().catch((e) => {
      g._schema = undefined;
      throw e;
    });
  }
  return g._schema;
}

async function boot() {
  const { catalogVersion, syncCatalog, seedHistory } = await import("./catalog");
  const version = `${BOOT_REV}-${catalogVersion()}`;
  try {
    const [r] = await sql`SELECT value FROM settings WHERE key = 'boot_version'`;
    if (r?.value === version) return;
  } catch {
    // table settings absente : première initialisation
  }
  await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    await db`SELECT pg_advisory_xact_lock(727210)`;
    await createSchema(db);
    const [r] = await db`SELECT value FROM settings WHERE key = 'boot_version'`;
    if (r?.value === version) return; // une autre instance vient de le faire
    await syncCatalog(db);
    await seedHistory(db);
    try {
      await tx.savepoint(async (sp) => {
        const { setupAnalytics } = await import("./analytics");
        await setupAnalytics(sp as unknown as Db);
      });
    } catch (e) {
      console.error("analytics setup failed", e);
    }
    await db`INSERT INTO settings (key, value) VALUES ('boot_version', ${version})
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  });
}

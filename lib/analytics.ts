import { sql } from "./db";

/**
 * Schéma `analytics` : vues en lecture seule pour l'exploration SQL (sans mots de passe),
 * et rôle `analytics_reader` qui n'a accès qu'à ces vues.
 */
export async function setupAnalytics() {
  await sql`CREATE SCHEMA IF NOT EXISTS analytics`;
  await sql.unsafe(`
    CREATE OR REPLACE VIEW analytics.players AS
      SELECT u.id AS player_id, u.display_name AS player, u.is_admin, u.created_at,
             (SELECT count(*) FROM league_members m WHERE m.user_id = u.id)::int AS leagues
      FROM users u;

    CREATE OR REPLACE VIEW analytics.leagues AS
      SELECT l.id AS league_id, l.name, l.code, l.owner_id AS owner_player_id, l.created_at,
             (SELECT count(*) FROM league_members m WHERE m.league_id = l.id)::int AS members
      FROM leagues l;

    CREATE OR REPLACE VIEW analytics.league_members AS
      SELECT m.league_id, l.name AS league, l.code, m.user_id AS player_id, u.display_name AS player, m.joined_at
      FROM league_members m JOIN leagues l ON l.id = m.league_id JOIN users u ON u.id = m.user_id;

    CREATE OR REPLACE VIEW analytics.athletes AS
      SELECT id AS athlete_id, display_name AS athlete, first_name, last_name, sport, gender, country,
             in_intl, in_fr, note, status, created_by AS created_by_player_id, created_at
      FROM athletes;

    CREATE OR REPLACE VIEW analytics.predictions AS
      SELECT p.user_id AS player_id, u.display_name AS player, p.season, p.category, p.position,
             p.athlete_id, p.athlete, a.sport, a.country, p.updated_at
      FROM predictions p JOIN users u ON u.id = p.user_id LEFT JOIN athletes a ON a.id = p.athlete_id;

    CREATE OR REPLACE VIEW analytics.results AS
      SELECT r.season, r.category, r.position, r.athlete_id, r.athlete, a.sport, a.country
      FROM results r LEFT JOIN athletes a ON a.id = r.athlete_id;

    CREATE OR REPLACE VIEW analytics.prediction_points AS
      SELECT p.player_id, p.player, p.season, p.category, p.position, p.athlete_id, p.athlete,
             CASE
               WHEN exact.position IS NOT NULL THEN 3
               WHEN anyr.position IS NOT NULL THEN 1
               ELSE 0
             END AS points
      FROM analytics.predictions p
      LEFT JOIN results exact ON exact.season = p.season AND exact.category = p.category
        AND exact.position = p.position
        AND (exact.athlete_id = p.athlete_id OR (p.athlete_id IS NULL AND lower(exact.athlete) = lower(p.athlete)))
      LEFT JOIN LATERAL (
        SELECT r.position FROM results r
        WHERE r.season = p.season AND r.category = p.category
          AND (r.athlete_id = p.athlete_id OR (p.athlete_id IS NULL AND lower(r.athlete) = lower(p.athlete)))
        LIMIT 1
      ) anyr ON true;

    CREATE OR REPLACE VIEW analytics.submissions AS
      SELECT u.id AS player_id, u.display_name AS player, s.season,
             count(p.position)::int AS picks,
             count(p.position) FILTER (WHERE p.category = 'monde')::int AS monde,
             count(p.position) FILTER (WHERE p.category = 'france')::int AS france,
             count(p.position) FILTER (WHERE p.athlete_id IS NULL)::int AS unresolved,
             max(p.updated_at) AS last_update
      FROM users u
      CROSS JOIN (SELECT DISTINCT season FROM predictions UNION SELECT extract(year FROM now())::int) s
      LEFT JOIN predictions p ON p.user_id = u.id AND p.season = s.season
      GROUP BY u.id, u.display_name, s.season;
  `);
  // Rôle lecture seule limité au schéma analytics (best effort : dépend des droits sur l'hébergeur)
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_reader') THEN
        CREATE ROLE analytics_reader NOLOGIN;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA analytics TO analytics_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analytics_reader;
  `);
  try {
    await sql.unsafe(`GRANT analytics_reader TO CURRENT_USER WITH SET TRUE`);
  } catch {
    try {
      await sql.unsafe(`GRANT analytics_reader TO CURRENT_USER`);
    } catch {}
  }
}

export const ANALYTICS_DOC = {
  players: "player_id, player, is_admin, created_at, leagues",
  leagues: "league_id, name, code, owner_player_id, created_at, members",
  league_members: "league_id, league, code, player_id, player, joined_at",
  athletes: "athlete_id, athlete, first_name, last_name, sport, gender, country, in_intl, in_fr, note, status, created_by_player_id, created_at",
  predictions: "player_id, player, season, category ('monde'|'france'), position (1-10), athlete_id, athlete, sport, country, updated_at",
  results: "season, category, position, athlete_id, athlete, sport, country",
  prediction_points: "player_id, player, season, category, position, athlete_id, athlete, points (3 exact / 1 in top 10 / 0)",
  submissions: "player_id, player, season, picks (0-20), monde, france, unresolved (saisie libre non rattachée), last_update",
};

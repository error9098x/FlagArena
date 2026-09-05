import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788580000000 implements MigrationInterface {
  async up(db: QueryRunner): Promise<void> {
    await db.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY, username varchar(32) NOT NULL,
        email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
        password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('admin','author','player')),
        is_verified boolean NOT NULL DEFAULT false, is_suspended boolean NOT NULL DEFAULT false,
        must_change_password boolean NOT NULL DEFAULT false, token_version integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE verification_codes (
        user_id uuid PRIMARY KEY REFERENCES users(id), code_hash text NOT NULL,
        expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
      );
      CREATE TABLE password_resets (
        user_id uuid PRIMARY KEY REFERENCES users(id), token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL
      );
      CREATE TABLE refresh_sessions (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), token_hash text NOT NULL UNIQUE,
        family_id uuid NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX refresh_user_idx ON refresh_sessions(user_id);
      CREATE INDEX refresh_family_idx ON refresh_sessions(family_id);
      CREATE TABLE request_limits (
        key text PRIMARY KEY, count integer NOT NULL CHECK (count > 0), expires_at timestamptz NOT NULL
      );
      CREATE TABLE challenges (
        id uuid PRIMARY KEY, author_id uuid NOT NULL REFERENCES users(id), title varchar(120) NOT NULL,
        description text NOT NULL, category text NOT NULL CHECK (category IN ('web','crypto','forensics','reverse','pwn','osint','misc')),
        difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','disabled','archived')),
        visibility text NOT NULL CHECK (visibility IN ('public_practice','event_only')),
        base_points integer NOT NULL CHECK (base_points BETWEEN 50 AND 1000), flag_hash text NOT NULL,
        connection_info text NOT NULL DEFAULT '', rejection_reason text,
        approved_by uuid REFERENCES users(id), approved_at timestamptz, released_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX challenge_catalog_idx ON challenges(status, visibility, category, difficulty);
      CREATE TABLE resources (
        id uuid PRIMARY KEY, challenge_id uuid NOT NULL REFERENCES challenges(id), label varchar(160) NOT NULL,
        url text, filename text, storage_name text UNIQUE, size bigint,
        CHECK ((url IS NOT NULL AND url LIKE 'https://%' AND storage_name IS NULL AND filename IS NULL AND size IS NULL)
          OR (url IS NULL AND storage_name IS NOT NULL AND filename IS NOT NULL AND size BETWEEN 0 AND 104857600))
      );
      CREATE INDEX resource_challenge_idx ON resources(challenge_id);
      CREATE TABLE hints (
        id uuid PRIMARY KEY, challenge_id uuid NOT NULL REFERENCES challenges(id), position integer NOT NULL,
        content text NOT NULL, cost integer NOT NULL CHECK (cost >= 0), UNIQUE(challenge_id,position)
      );
      CREATE TABLE events (
        id uuid PRIMARY KEY, title varchar(120) NOT NULL, description text NOT NULL, rules text NOT NULL DEFAULT '',
        starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
        status text NOT NULL CHECK (status IN ('draft','scheduled','archived')),
        access text NOT NULL CHECK (access IN ('open','invite_only')), join_code_hash text,
        dynamic_scoring boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
        CHECK (access = 'open' OR join_code_hash IS NOT NULL)
      );
      CREATE INDEX event_window_idx ON events(status, starts_at, ends_at);
      CREATE TABLE event_challenges (
        event_id uuid NOT NULL REFERENCES events(id), challenge_id uuid NOT NULL REFERENCES challenges(id),
        PRIMARY KEY (event_id,challenge_id)
      );
      CREATE TABLE registrations (
        user_id uuid NOT NULL REFERENCES users(id), event_id uuid NOT NULL REFERENCES events(id),
        joined_at timestamptz NOT NULL DEFAULT now(), attended_at timestamptz, PRIMARY KEY(user_id,event_id)
      );
      CREATE TABLE submissions (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), challenge_id uuid NOT NULL REFERENCES challenges(id),
        event_id uuid REFERENCES events(id), result text NOT NULL CHECK (result IN ('correct','incorrect')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX submission_activity_idx ON submissions(user_id, created_at DESC);
      CREATE INDEX submission_challenge_idx ON submissions(challenge_id, created_at DESC);
      CREATE TABLE solves (
        id uuid PRIMARY KEY, submission_id uuid NOT NULL UNIQUE REFERENCES submissions(id), user_id uuid NOT NULL REFERENCES users(id),
        challenge_id uuid NOT NULL REFERENCES challenges(id), event_id uuid REFERENCES events(id),
        context_key text NOT NULL, points integer NOT NULL CHECK (points >= 0), original_points integer NOT NULL CHECK (original_points >= 0),
        invalidated boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id,challenge_id,context_key),
        CHECK ((event_id IS NULL AND context_key = 'practice') OR (event_id IS NOT NULL AND context_key = event_id::text))
      );
      CREATE INDEX solve_leaderboard_idx ON solves(context_key, user_id) WHERE NOT invalidated;
      CREATE INDEX solve_decay_idx ON solves(challenge_id, context_key) WHERE NOT invalidated;
      CREATE TABLE hint_unlocks (
        user_id uuid NOT NULL REFERENCES users(id), hint_id uuid NOT NULL REFERENCES hints(id),
        cost integer NOT NULL CHECK (cost >= 0), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,hint_id)
      );
      CREATE TABLE attempt_state (
        user_id uuid NOT NULL REFERENCES users(id), challenge_id uuid NOT NULL REFERENCES challenges(id),
        wrong_attempts integer NOT NULL DEFAULT 0 CHECK (wrong_attempts >= 0),
        window_started_at timestamptz NOT NULL DEFAULT now(), locked_until timestamptz,
        PRIMARY KEY(user_id,challenge_id)
      );
      CREATE TABLE reviews (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), challenge_id uuid NOT NULL REFERENCES challenges(id),
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), comment text NOT NULL DEFAULT '', hidden boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,challenge_id)
      );
      CREATE INDEX review_challenge_idx ON reviews(challenge_id);
      CREATE TABLE audit_log (
        id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL, target_id uuid NOT NULL,
        reason text, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX audit_time_idx ON audit_log(created_at DESC);
    `);
  }

  async down(db: QueryRunner): Promise<void> {
    await db.query(
      "DROP TABLE audit_log, reviews, attempt_state, hint_unlocks, solves, submissions, registrations, event_challenges, events, hints, resources, challenges, request_limits, refresh_sessions, password_resets, verification_codes, users",
    );
  }
}

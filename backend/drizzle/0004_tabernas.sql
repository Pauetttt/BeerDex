-- Fase Tabernas (multijugador): grupos de hasta 10 jugadores con minijuego mensual.
-- Migración idempotente (se puede re-ejecutar sin efectos en Neon y PGlite).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taberna_visibility') THEN
    CREATE TYPE "public"."taberna_visibility" AS ENUM('public', 'private');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taberna_role') THEN
    CREATE TYPE "public"."taberna_role" AS ENUM('leader', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taberna_request_status') THEN
    CREATE TYPE "public"."taberna_request_status" AS ENUM('pending', 'accepted', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taberna_game_type') THEN
    CREATE TYPE "public"."taberna_game_type" AS ENUM('bingo', 'escalera', 'ruta', 'tridente', 'cata');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taberna_mission_status') THEN
    CREATE TYPE "public"."taberna_mission_status" AS ENUM('active', 'completed', 'expired');
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tabernas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(30) NOT NULL,
  "description" varchar(200) DEFAULT '' NOT NULL,
  "visibility" "taberna_visibility" DEFAULT 'public' NOT NULL,
  "min_beers" integer DEFAULT 0 NOT NULL,
  "leader_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "founder_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tabernas_min_beers_check" CHECK ("min_beers" >= 0),
  CONSTRAINT "tabernas_level_check" CHECK ("level" >= 1 AND "level" <= 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tabernas_name_lower_unique" ON "tabernas" (lower("name"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tabernas_ranking_idx" ON "tabernas" ("level", "points");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_members" (
  "taberna_id" uuid NOT NULL REFERENCES "tabernas"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "taberna_role" DEFAULT 'member' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "taberna_members_taberna_id_user_id_pk" PRIMARY KEY ("taberna_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taberna_members_user_id_idx" ON "taberna_members" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "taberna_id" uuid NOT NULL REFERENCES "tabernas"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "taberna_request_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taberna_requests_pending_unique"
  ON "taberna_requests" ("taberna_id", "user_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_cooldowns" (
  "taberna_id" uuid NOT NULL REFERENCES "tabernas"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "until" timestamp with time zone NOT NULL,
  CONSTRAINT "taberna_cooldowns_taberna_id_user_id_pk" PRIMARY KEY ("taberna_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_missions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "taberna_id" uuid NOT NULL REFERENCES "tabernas"("id") ON DELETE CASCADE,
  "month" varchar(7) NOT NULL,
  "game_type" "taberna_game_type" NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "taberna_mission_status" DEFAULT 'active' NOT NULL,
  "progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "points_awarded" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "taberna_missions_taberna_month_unique" UNIQUE ("taberna_id", "month")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taberna_missions_month_idx" ON "taberna_missions" ("month");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_contributions" (
  "id" serial PRIMARY KEY NOT NULL,
  "mission_id" uuid NOT NULL REFERENCES "taberna_missions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "beer_id" integer NOT NULL REFERENCES "beers"("id") ON DELETE CASCADE,
  "slot_key" varchar(80),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "taberna_contributions_mission_user_beer_unique" UNIQUE ("mission_id", "user_id", "beer_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taberna_contributions_mission_idx" ON "taberna_contributions" ("mission_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_mission_milestones" (
  "mission_id" uuid NOT NULL REFERENCES "taberna_missions"("id") ON DELETE CASCADE,
  "milestone_key" varchar(40) NOT NULL,
  "reached_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "taberna_mission_milestones_pk" PRIMARY KEY ("mission_id", "milestone_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_rewards_claimed" (
  "mission_id" uuid NOT NULL REFERENCES "taberna_missions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "milestone_key" varchar(40) NOT NULL,
  "chapas" integer DEFAULT 0 NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "taberna_rewards_claimed_pk" PRIMARY KEY ("mission_id", "user_id", "milestone_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_level_rewards" (
  "taberna_id" uuid NOT NULL REFERENCES "tabernas"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "level" integer NOT NULL,
  "chapas" integer DEFAULT 0 NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "taberna_level_rewards_pk" PRIMARY KEY ("taberna_id", "user_id", "level")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taberna_month_closures" (
  "month" varchar(7) PRIMARY KEY NOT NULL,
  "closed_at" timestamp with time zone DEFAULT now() NOT NULL
);

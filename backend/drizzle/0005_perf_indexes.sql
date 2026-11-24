-- Índices de rendimiento para consultas frecuentes de logros y Tabernas
CREATE INDEX IF NOT EXISTS "user_achievements_user_unlocked_idx"
  ON "user_achievements" ("user_id", "unlocked");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taberna_contributions_mission_user_idx"
  ON "taberna_contributions" ("mission_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taberna_requests_taberna_status_idx"
  ON "taberna_requests" ("taberna_id", "status");

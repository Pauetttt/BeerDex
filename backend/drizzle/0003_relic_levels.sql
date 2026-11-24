ALTER TABLE "user_cosmetics" ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_cosmetics_level_check'
  ) THEN
    ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_level_check" CHECK ("level" >= 1 AND "level" <= 5);
  END IF;
END $$;

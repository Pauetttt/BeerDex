CREATE TABLE "beer_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"barcode" varchar(13) NOT NULL,
	"brand_name" varchar(120) NOT NULL,
	"beer_name" varchar(150) NOT NULL,
	"format" "beer_format" NOT NULL,
	"notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beer_suggestions" ADD CONSTRAINT "beer_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beer_suggestions_barcode_idx" ON "beer_suggestions" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "beer_suggestions_user_id_idx" ON "beer_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "beers_brand_id_idx" ON "beers" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "friendships_requester_status_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "friendships_addressee_status_idx" ON "friendships" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_beers_user_id_idx" ON "user_beers" USING btree ("user_id");
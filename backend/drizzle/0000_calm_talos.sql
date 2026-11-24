CREATE TYPE "public"."beer_format" AS ENUM('lata', 'botellin', 'litrona');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(60) NOT NULL,
	"target_value" integer NOT NULL,
	"reward_title_id" integer,
	"reward_icon_id" integer,
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "beers" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"format" "beer_format" NOT NULL,
	"barcode" varchar(13) NOT NULL,
	"short_history" varchar(150) NOT NULL,
	"style" varchar(80) NOT NULL,
	"abv" numeric(4, 2) NOT NULL,
	"country" varchar(80) NOT NULL,
	CONSTRAINT "beers_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"logo_url" text,
	"history" text,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_requester_addressee_unique" UNIQUE("requester_id","addressee_id"),
	CONSTRAINT "friendships_not_self_check" CHECK ("friendships"."requester_id" <> "friendships"."addressee_id")
);
--> statement-breakpoint
CREATE TABLE "icons" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"image_url" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"unlock_achievement_id" integer,
	CONSTRAINT "icons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"unlock_achievement_id" integer,
	CONSTRAINT "titles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" integer NOT NULL,
	"current_progress" integer DEFAULT 0 NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_at" timestamp with time zone,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_beer_flips" (
	"user_id" uuid NOT NULL,
	"beer_id" integer NOT NULL,
	"flipped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_beer_flips_user_id_beer_id_pk" PRIMARY KEY("user_id","beer_id")
);
--> statement-breakpoint
CREATE TABLE "user_beers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"beer_id" integer NOT NULL,
	"photo_url" text NOT NULL,
	"rating" integer NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_beers_user_beer_unique" UNIQUE("user_id","beer_id"),
	CONSTRAINT "user_beers_rating_check" CHECK ("user_beers"."rating" >= 1 AND "user_beers"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "user_profile_visits" (
	"visitor_id" uuid NOT NULL,
	"visited_user_id" uuid NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_visits_visitor_id_visited_user_id_pk" PRIMARY KEY("visitor_id","visited_user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(60) NOT NULL,
	"password_hash" text NOT NULL,
	"equipped_icon_id" integer DEFAULT 1 NOT NULL,
	"equipped_title_id" integer DEFAULT 1 NOT NULL,
	"flips_read_count" integer DEFAULT 0 NOT NULL,
	"profiles_visited_count" integer DEFAULT 0 NOT NULL,
	"has_changed_icon" boolean DEFAULT false NOT NULL,
	"has_equipped_unlocked_title" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_reward_title_id_titles_id_fk" FOREIGN KEY ("reward_title_id") REFERENCES "public"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_reward_icon_id_icons_id_fk" FOREIGN KEY ("reward_icon_id") REFERENCES "public"."icons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beers" ADD CONSTRAINT "beers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icons" ADD CONSTRAINT "icons_unlock_achievement_id_achievements_id_fk" FOREIGN KEY ("unlock_achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_unlock_achievement_id_achievements_id_fk" FOREIGN KEY ("unlock_achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beer_flips" ADD CONSTRAINT "user_beer_flips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beer_flips" ADD CONSTRAINT "user_beer_flips_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beers" ADD CONSTRAINT "user_beers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beers" ADD CONSTRAINT "user_beers_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile_visits" ADD CONSTRAINT "user_profile_visits_visitor_id_users_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile_visits" ADD CONSTRAINT "user_profile_visits_visited_user_id_users_id_fk" FOREIGN KEY ("visited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipped_icon_id_icons_id_fk" FOREIGN KEY ("equipped_icon_id") REFERENCES "public"."icons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipped_title_id_titles_id_fk" FOREIGN KEY ("equipped_title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;
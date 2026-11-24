CREATE TYPE "public"."cosmetic_type" AS ENUM('frame', 'card_style', 'relic', 'color_theme');--> statement-breakpoint
CREATE TABLE "cosmetics" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"type" "cosmetic_type" NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"preview_key" varchar(120) NOT NULL,
	"source" varchar(20) DEFAULT 'achievement' NOT NULL,
	"price_chapas" integer,
	"unlock_achievement_id" integer,
	"metadata_json" text,
	CONSTRAINT "cosmetics_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_completed_brands" (
	"user_id" uuid NOT NULL,
	"brand_id" integer NOT NULL,
	"rewarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_completed_brands_user_id_brand_id_pk" PRIMARY KEY("user_id","brand_id")
);
--> statement-breakpoint
CREATE TABLE "user_cosmetics" (
	"user_id" uuid NOT NULL,
	"cosmetic_id" integer NOT NULL,
	"source" varchar(20) DEFAULT 'shop' NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_cosmetics_user_id_cosmetic_id_pk" PRIMARY KEY("user_id","cosmetic_id")
);
--> statement-breakpoint
CREATE TABLE "user_icons" (
	"user_id" uuid NOT NULL,
	"icon_id" integer NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_icons_user_id_icon_id_pk" PRIMARY KEY("user_id","icon_id")
);
--> statement-breakpoint
CREATE TABLE "user_titles" (
	"user_id" uuid NOT NULL,
	"title_id" integer NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_titles_user_id_title_id_pk" PRIMARY KEY("user_id","title_id")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "reward_chapas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "reward_cosmetic_id" integer;--> statement-breakpoint
ALTER TABLE "icons" ADD COLUMN "source" varchar(20) DEFAULT 'achievement' NOT NULL;--> statement-breakpoint
ALTER TABLE "icons" ADD COLUMN "price_chapas" integer;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "source" varchar(20) DEFAULT 'achievement' NOT NULL;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "price_chapas" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "chapas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "chapas_backfilled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equipped_frame_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equipped_card_style_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equipped_color_theme_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "showcase_slot_1_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "showcase_slot_2_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "showcase_slot_3_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_registered_pack" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_submitted_suggestion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cosmetics" ADD CONSTRAINT "cosmetics_unlock_achievement_id_achievements_id_fk" FOREIGN KEY ("unlock_achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_completed_brands" ADD CONSTRAINT "user_completed_brands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_completed_brands" ADD CONSTRAINT "user_completed_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_icons" ADD CONSTRAINT "user_icons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_icons" ADD CONSTRAINT "user_icons_icon_id_icons_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."icons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_reward_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("reward_cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipped_frame_id_cosmetics_id_fk" FOREIGN KEY ("equipped_frame_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipped_card_style_id_cosmetics_id_fk" FOREIGN KEY ("equipped_card_style_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_equipped_color_theme_id_cosmetics_id_fk" FOREIGN KEY ("equipped_color_theme_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_showcase_slot_1_id_cosmetics_id_fk" FOREIGN KEY ("showcase_slot_1_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_showcase_slot_2_id_cosmetics_id_fk" FOREIGN KEY ("showcase_slot_2_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_showcase_slot_3_id_cosmetics_id_fk" FOREIGN KEY ("showcase_slot_3_id") REFERENCES "public"."cosmetics"("id") ON DELETE set null ON UPDATE no action;
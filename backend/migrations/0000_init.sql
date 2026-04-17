CREATE TABLE IF NOT EXISTS "athlete_graph_deltas" (
	"athlete_id" text PRIMARY KEY NOT NULL,
	"delta" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athlete_graph_draft_deltas" (
	"athlete_id" text PRIMARY KEY NOT NULL,
	"delta" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athlete_graphs_legacy" (
	"athlete_id" text PRIMARY KEY NOT NULL,
	"graph" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athlete_training_state" (
	"athlete_id" text PRIMARY KEY NOT NULL,
	"mastery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readiness" integer DEFAULT 100 NOT NULL,
	"skill_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conditional" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"diagnostic" jsonb,
	"dashboard" jsonb,
	"reonboard_status" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "athletes" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text NOT NULL,
	"age" integer NOT NULL,
	"position" text NOT NULL,
	"school_year" text NOT NULL,
	"sport" text NOT NULL,
	"avatar_url" text,
	"avatar_color" text NOT NULL,
	"tagline" text NOT NULL,
	"initial_mastery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"initial_readiness" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sport_plans" (
	"coach_id" uuid NOT NULL,
	"sport" text NOT NULL,
	"graph" jsonb NOT NULL,
	"version" text NOT NULL,
	"requirements" text DEFAULT '' NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sport_plans_coach_id_sport_pk" PRIMARY KEY("coach_id","sport")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "athlete_graph_deltas" ADD CONSTRAINT "athlete_graph_deltas_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "athlete_graph_draft_deltas" ADD CONSTRAINT "athlete_graph_draft_deltas_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "athlete_graphs_legacy" ADD CONSTRAINT "athlete_graphs_legacy_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "athlete_training_state" ADD CONSTRAINT "athlete_training_state_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "athletes" ADD CONSTRAINT "athletes_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sport_plans" ADD CONSTRAINT "sport_plans_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

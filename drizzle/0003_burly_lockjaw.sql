ALTER TABLE "election" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "election" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
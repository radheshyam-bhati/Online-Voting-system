CREATE TABLE "rate_limit_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_identifier" ON "rate_limit_attempt" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_created_at" ON "rate_limit_attempt" USING btree ("created_at");
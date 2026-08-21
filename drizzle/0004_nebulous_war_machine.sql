CREATE UNIQUE INDEX "uq_club_name_election_campus" ON "club" USING btree ("election_id","campus_id","name") WHERE "club"."campus_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_club_name_election_null_campus" ON "club" USING btree ("election_id","name") WHERE "club"."campus_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_election_status" ON "election" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_election_starts_at" ON "election" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "idx_election_ends_at" ON "election" USING btree ("ends_at");
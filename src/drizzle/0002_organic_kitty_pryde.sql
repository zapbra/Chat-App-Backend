DROP INDEX "username_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "username_lower_idx" ON "users" USING btree (LOWER("username"));
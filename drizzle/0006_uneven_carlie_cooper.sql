ALTER TABLE "dm_reads" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dm_reads" CASCADE;--> statement-breakpoint
ALTER TABLE "direct_message_reads" DROP CONSTRAINT "direct_message_reads_other_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "direct_message_reads" DROP CONSTRAINT "direct_message_reads_last_read_message_id_messages_id_fk";
--> statement-breakpoint
DROP INDEX "sender_receiver_idx";--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD COLUMN "thread_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN "thread_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD CONSTRAINT "direct_message_reads_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_reads" ADD CONSTRAINT "direct_message_reads_last_read_message_id_direct_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."direct_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dm_message_reads_user_thread_unique_idx" ON "direct_message_reads" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "thread_created_idx" ON "direct_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
ALTER TABLE "direct_message_reads" DROP COLUMN "other_user_id";
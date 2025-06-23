CREATE TABLE "dm_likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dm_likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"liker_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dm_reactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dm_reactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"reacter_id" integer NOT NULL,
	"emoji" text NOT NULL,
	"message_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN "replying_to" integer;--> statement-breakpoint
ALTER TABLE "dm_likes" ADD CONSTRAINT "dm_likes_liker_id_users_id_fk" FOREIGN KEY ("liker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_likes" ADD CONSTRAINT "dm_likes_message_id_direct_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."direct_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_reactions" ADD CONSTRAINT "dm_reactions_reacter_id_users_id_fk" FOREIGN KEY ("reacter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_reactions" ADD CONSTRAINT "dm_reactions_message_id_direct_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."direct_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dm_likes_liker_message_unique_idx" ON "dm_likes" USING btree ("liker_id","message_id");--> statement-breakpoint
CREATE INDEX "dm_likes_message_id_idx" ON "dm_likes" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_reactions_user_message_emoji_unique_idx" ON "dm_reactions" USING btree ("reacter_id","message_id","emoji");--> statement-breakpoint
CREATE INDEX "dm_reactions_message_id_emoji_idx" ON "dm_reactions" USING btree ("message_id","emoji");--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_replying_to_messages_id_fk" FOREIGN KEY ("replying_to") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;
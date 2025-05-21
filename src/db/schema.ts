import * as t from "drizzle-orm/pg-core";
import timestamps from "./columns.helpers";
import { pgEnum, pgTable as table } from "drizzle-orm/pg-core";

export const users = table(
  "users",
  {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    first_name: t.varchar("first_name", { length: 256 }),
    last_name: t.varchar("last_name", { length: 256 }),
    username: t.varchar("username", { length: 50 }).notNull(),
    email: t.varchar().notNull(),
    password_hash: t.varchar("password_hash", { length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => [
    t.uniqueIndex("email_idx").on(table.email),
    t.uniqueIndex("username_idx").on(table.username),
  ]
);

export const chatRooms = table("chat_rooms", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.varchar("name", { length: 50 }),
  description: t.varchar("description", { length: 255 }),
  ...timestamps,
});

export const messages = table("messages", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  senderId: t
    .integer("sender_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  roomId: t
    .integer("room_id")
    .references(() => chatRooms.id, { onDelete: "cascade" })
    .notNull(),
  message: t.text("message").notNull(),
  ...timestamps,
});

export const likes = table(
  "likes",
  {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    liker_id: t
      .integer("liker_id")
      .references(() => users.id)
      .notNull(),
    message_id: t
      .integer("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    ...timestamps,
  },
  (table) => [
    t
      .uniqueIndex("liker_message_unique_idx")
      .on(table.liker_id, table.message_id),
    t.index("message_id_idx").on(table.message_id),
  ]
);

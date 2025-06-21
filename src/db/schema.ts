import * as t from "drizzle-orm/pg-core";
import timestamps from "./columns.helpers";
import { pgEnum, pgTable as table } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
        t.uniqueIndex("username_lower_idx").on(sql`LOWER(${table.username})`),
    ]
);

export const chatRooms = table("chat_rooms", {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    name: t.varchar("name", { length: 50 }),
    description: t.varchar("description", { length: 255 }),
    ...timestamps,
});

export const messages = t.pgTable("messages", {
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
    replyingTo: t
        .integer("replying_to")
        .references((): t.AnyPgColumn => messages.id, { onDelete: "set null" }),
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

export const messageReactions = table(
    "message_reactions",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        reacter_id: t
            .integer("reacter_id")
            .references(() => users.id)
            .notNull(),
        emoji: t.text("emoji").notNull(),
        message_id: t
            .integer("message_id")
            .references(() => messages.id, { onDelete: "cascade" })
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t
            .uniqueIndex("user_message_emoji_unique_idx")
            .on(table.reacter_id, table.message_id, table.emoji),
        t.index("message_id_emoji_idx").on(table.message_id, table.emoji),
    ]
);

export const chatMentions = table(
    "chat_mentions",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        message_id: t
            .integer("message_id")
            .references(() => messages.id)
            .notNull(),
        mentioned_user_id: t
            .integer("mentioned_user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        seen_at: timestamp(),
        ...timestamps,
    },
    (table) => [
        t.index("mention_user_idx").on(table.mentioned_user_id),
        t.index("mention_message_idx").on(table.message_id),
    ]
);

export const favoriteChatrooms = table(
    "favorite_chatrooms",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        chatroom_id: t
            .integer("chatroom_id")
            .references(() => chatRooms.id)
            .notNull(),
        user_id: t
            .integer("user_id")
            .references(() => users.id)
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t
            .uniqueIndex("favorite_chatrooms_user_chatroom_unique_idx")
            .on(table.chatroom_id, table.user_id),
    ]
);

export const chatReads = table(
    "chat_reads",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        user_id: t
            .integer("user_id")
            .references(() => users.id)
            .notNull(),
        chatroom_id: t
            .integer("chatroom_id")
            .references(() => chatRooms.id)
            .notNull(),
        last_read_message_id: t
            .integer("last_read_message_id")
            .references(() => messages.id)
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t
            .uniqueIndex("chat_reads_user_chatroom_unique_idx")
            .on(table.chatroom_id, table.user_id),
    ]
);

export const dmThreads = table(
    "dm_threads",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        ...timestamps,
    },
    (table) => []
);

export const dmThreadParticipants = table(
    "dm_thread_participants",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        thread_id: t
            .integer("thread_id")
            .references(() => dmThreads.id)
            .notNull(),
        user_id: t
            .integer("user_id")
            .references(() => users.id)
            .notNull(),
        ...timestamps,
    },
    (table) => [t.uniqueIndex("thread_user_unique").on(table.id, table.user_id)]
);

export const directMessages = table(
    "direct_messages",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        message: t.text("message").notNull(),
        thread_id: t
            .integer("thread_id")
            .references(() => dmThreads.id)
            .notNull(),
        sender_id: t
            .integer("sender_id")
            .references(() => users.id, { onDelete: "set null" })
            .notNull(),
        receiver_id: t
            .integer("receiver_id")
            .references(() => users.id, { onDelete: "set null" })
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t.index("thread_created_idx").on(table.thread_id, table.created_at),
    ]
);

export const directMessageReads = table(
    "direct_message_reads",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        thread_id: t
            .integer("thread_id")
            .references(() => dmThreads.id)
            .notNull(),
        user_id: t
            .integer("user_id")
            .references(() => users.id, { onDelete: "set null" })
            .notNull(),
        last_read_message_id: t
            .integer("last_read_message_id")
            .references(() => directMessages.id, { onDelete: "set null" })
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t
            .uniqueIndex("dm_message_reads_user_thread_unique_idx")
            .on(table.user_id, table.thread_id),
    ]
);

export const followers = table(
    "followers",
    {
        id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
        following_id: t
            .integer("following_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        follower_id: t
            .integer("follower_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        ...timestamps,
    },
    (table) => [
        t
            .uniqueIndex("followers_following_follower_unique_idx")
            .on(table.following_id, table.follower_id),
    ]
);

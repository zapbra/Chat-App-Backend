import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
    directMessageReads,
    directMessages,
    dmThreadParticipants,
    dmThreads,
    messages,
} from "../db/schema";
import { CustomError } from "../lib/custom-error";
export class MessageDataService {
    static async createMessage(
        roomId: string,
        senderId: number,
        message: string,
        replyId: number | null
    ) {
        return await db
            .insert(messages)
            .values({
                senderId,
                roomId: Number(roomId),
                message,
                replyingTo: replyId,
            })
            .returning();
    }

    static async createThreadWithUsers(
        userAId: number,
        userBId: number
    ): Promise<number> {
        try {
            const threadId = await db.transaction(async (tx) => {
                const [thread] = await tx
                    .insert(dmThreads)
                    .values({})
                    .returning();
                const threadId = thread.id;

                await tx.insert(dmThreadParticipants).values([
                    { thread_id: threadId, user_id: userAId },
                    { thread_id: threadId, user_id: userBId },
                ]);
                await tx.insert(directMessageReads).values([
                    { thread_id: threadId, user_id: userAId },
                    { thread_id: threadId, user_id: userBId },
                ]);
                return threadId;
            });

            return threadId;
        } catch (error) {
            console.error("Failed to create thread with users:", error);
            // Improve this error message to display the actual error
            throw new CustomError("Could not create thread", 500);
        }
    }

    static async getMessageById(messageId: number) {
        try {
            const message = (
                await db.execute(
                    sql`
                 SELECT 
                messages.id,
                messages.message,
                messages.created_at,
                messages.updated_at,
                messages.deleted_at,
                messages.sender_id,
                message_users.username,

                replying.id AS replying_to_id,
                replying.message AS replying_to_message,
                replying.created_at AS replying_to_created_at,
                replying_user.username AS replying_to_username,

                (
                    SELECT json_agg(json_build_object('id', likes.id, 'username', like_users.username))
                    FROM likes
                    LEFT JOIN users AS like_users ON likes.liker_id = like_users.id
                    WHERE likes.message_id = messages.id
                ) AS likes,

                (
                    SELECT json_agg(json_build_object('emoji', message_reactions.emoji, 'username', reaction_users.username))
                    FROM message_reactions
                    LEFT JOIN users AS reaction_users ON message_reactions.reacter_id = reaction_users.id
                    WHERE message_reactions.message_id = messages.id
                ) AS reactions,

                (
                    SELECT count(*) FROM likes WHERE likes.message_id = messages.id
                ) AS likes_count

                FROM messages
                LEFT JOIN users AS message_users ON messages.sender_id = message_users.id
                LEFT JOIN messages AS replying ON messages.replying_to = replying.id
                LEFT JOIN users AS replying_user ON replying.sender_id = replying_user.id
                WHERE messages.id = ${messageId}
                ORDER BY messages.id DESC
                LIMIT(1);`
                )
            ).rows?.[0];

            return message;
        } catch (error) {
            console.error("Error fetching message by ID:", error);
            return null;
        }
    }

    static async createDirectMessage(
        senderId: number,
        receiverId: number,
        message: string,
        threadId: number | null
    ) {
        // Error if any missing function paramaters, except thread id
        if (!senderId || !receiverId || !message) {
            throw new CustomError("Missing input", 400);
        }

        try {
            // must create a thread if it's not provided
            // probably should update this to check if the thread id is actually valid
            // Also check if a thread exists between the two provided user ids
            if (!threadId) {
                threadId = await this.createThreadWithUsers(
                    senderId,
                    receiverId
                );
            }

            const [newMessage] = await db
                .insert(directMessages)
                .values({
                    message: message,
                    thread_id: threadId,
                    sender_id: senderId,
                    receiver_id: receiverId,
                })
                .returning();

            return { message: newMessage, threadId };
        } catch (error) {
            // Improve this error message to display the actual error
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : "Could not create direct message",
                500
            );
        }
    }

    static async getAllUserDmThreads(
        userId: number
    ): Promise<{ threadId: number }[]> {
        try {
            const userThreads = await db
                .select({ threadId: dmThreadParticipants.thread_id })
                .from(dmThreadParticipants)
                .where(eq(dmThreadParticipants.user_id, userId));

            return userThreads;
        } catch (error) {
            // Improve this error message to display the actual error
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : "Could not fetch user DM threads",
                500
            );
        }
    }

    static async updateDmMessageRead(
        threadId: number,
        userId: number,
        messageId: number
    ) {
        try {
            const [updatedRow] = await db
                .update(directMessageReads)
                .set({
                    last_read_message_id: messageId,
                })
                .where(
                    and(
                        eq(directMessageReads.user_id, userId),
                        eq(directMessageReads.thread_id, threadId)
                    )
                )
                .returning();

            return updatedRow;
        } catch (error) {
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : "Could not update dm message read with latest message",
                500
            );
        }
    }
}

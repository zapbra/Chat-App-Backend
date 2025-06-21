import { eq } from "drizzle-orm";
import { db } from "../db";
import {
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
        message: string
    ) {
        return await db
            .insert(messages)
            .values({ senderId, roomId: Number(roomId), message })
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

                return threadId;
            });

            return threadId;
        } catch (error) {
            console.error("Failed to create thread with users:", error);
            // Improve this error message to display the actual error
            throw new CustomError("Could not create thread", 500);
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
}

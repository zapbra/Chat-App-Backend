import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { db } from "../db";
import { directMessages, dmThreadParticipants, dmThreads } from "../db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";

// Possibly will change this to higher, but it's just for testing
// purposes right now
const DIRECT_MESSAGE_LIMIT = 10;

export const getDirectMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const limit = req.query.limit
            ? Number(req.query.limit)
            : DIRECT_MESSAGE_LIMIT;

        const beforeId = req.query.beforeId
            ? Number(req.query.beforeId)
            : undefined;

        const otherUserId = Number(req.params.otherUserId);

        if (!otherUserId) {
            throw new Error("Other user id not provided");
        }

        if (!req.user?.id) {
            throw new Error("Unauthorized: Missing user id");
        }

        const loggedInUserId = req.user.id;

        const sharedThread = await db
            .select({ threadId: dmThreadParticipants.thread_id })
            .from(dmThreadParticipants)
            .where(
                inArray(dmThreadParticipants.user_id, [
                    loggedInUserId,
                    otherUserId,
                ])
            )
            .groupBy(dmThreadParticipants.thread_id)
            .having(sql`COUNT(*) = 2`)
            .limit(1);

        const threadId = sharedThread[0].threadId;

        const messages = await db
            .select({
                id: directMessages.id,
                message: directMessages.message,
                created_at: directMessages.created_at,
                updated_at: directMessages.updated_at,
                deleted_at: directMessages.deleted_at,
                sender_id: directMessages.sender_id,
                receiver_id: directMessages.receiver_id,
            })
            .from(directMessages)
            .where(eq(directMessages.thread_id, threadId))
            .orderBy(desc(directMessages.id))
            .limit(limit);

        const orderedMessages = messages.reverse();

        res.status(200).json({
            messages: orderedMessages,
        });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Unknown error`, 500));
        }
    }
};

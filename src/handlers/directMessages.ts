import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { db } from "../db";
import {
    directMessageReads,
    directMessages,
    dmThreadParticipants,
    dmThreads,
    users,
} from "../db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { MessageDataService } from "../services/MessageDataService";

// Possibly will change this to higher, but it's just for testing
// purposes right now
const DIRECT_MESSAGE_LIMIT = 10;

export const createThread = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
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

        if (sharedThread.length > 0) {
            res.status(409).json({
                error: `Thread already exists between user ${loggedInUserId} and ${otherUserId}`,
            });
            return;
        }

        const threadId = await MessageDataService.createThreadWithUsers(
            loggedInUserId,
            otherUserId
        );

        res.status(201).json({
            threadId,
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

        if (sharedThread.length === 0) {
            res.status(404).json({ error: "No direct message thread found" });
            return;
        }

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
            threadId: threadId,
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

export const getUserThreads = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ error: "User is not authorized" });
            return;
        }
        const loggedInUserId = req.user.id;

        const receiver = alias(users, "receiver");
        const latestMessages = await db
            .select({
                id: directMessages.id,
                message: directMessages.message,
                threadId: directMessages.thread_id,
                senderId: directMessages.sender_id,
                receiverId: directMessages.receiver_id,
                createdAt: directMessages.created_at,
                senderUsername: users.username,
                receiverUsername: receiver.username,
                isRead: sql`${directMessages.id} <= ${directMessageReads.last_read_message_id}`.as(
                    "is_read"
                ),
            })
            .from(directMessages)
            .innerJoin(users, eq(directMessages.sender_id, users.id))
            .innerJoin(receiver, eq(directMessages.receiver_id, receiver.id))
            .leftJoin(
                directMessageReads,
                and(
                    eq(directMessages.thread_id, directMessageReads.thread_id),
                    eq(directMessageReads.user_id, loggedInUserId)
                )
            )
            .where(
                inArray(
                    directMessages.id,
                    sql`(
        SELECT DISTINCT ON (thread_id) id
        FROM direct_messages
        WHERE thread_id IN (
          SELECT thread_id
          FROM dm_thread_participants
          WHERE user_id = ${loggedInUserId}
        )
        ORDER BY thread_id, created_at DESC
      )`
                )
            );

        res.status(200).json({ messages: latestMessages });
        return;
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

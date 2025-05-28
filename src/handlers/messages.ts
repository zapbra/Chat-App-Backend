import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { db } from "../db";
import { and, desc, eq, lt } from "drizzle-orm";
import {
    chatRooms,
    likes,
    messageReactions,
    messages,
    users,
} from "../db/schema";

export const toggleReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const messageId = Number(req.params.messageId);
        const userId = req.user!.id;
        const emoji = req.body.emoji;

        const message = await db.query.messages.findFirst({
            where: eq(messages.id, messageId),
        });

        if (!message) {
            res.status(404).json({ error: "Message not found" });
            return;
        }

        const existingReaction = await db.query.messageReactions.findFirst({
            where: and(
                eq(messageReactions.message_id, messageId),
                eq(messageReactions.reacter_id, userId),
                eq(messageReactions.emoji, emoji)
            ),
        });

        if (existingReaction) {
            await db
                .delete(messageReactions)
                .where(
                    and(
                        eq(messageReactions.message_id, messageId),
                        eq(messageReactions.reacter_id, userId),
                        eq(messageReactions.emoji, emoji)
                    )
                );
            res.status(200).json({
                message: "Reaction removed",
                reactedTo: false,
                reactId: existingReaction.id,
            });
            return;
        }

        const [reaction] = await db
            .insert(messageReactions)
            .values({
                reacter_id: userId,
                message_id: messageId,
                emoji: emoji,
            })
            .returning();

        res.status(201).json({
            message: "Reaction added",
            reactedTo: true,
            reactId: reaction.id,
        });
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
export const toggleLike = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const messageId = Number(req.params.id);
        const userId = req.user!.id;

        const message = await db.query.messages.findFirst({
            where: eq(messages.id, messageId),
        });

        if (!message) {
            res.status(404).json({ error: "Message not found" });
            return;
        }

        const existingLike = await db.query.likes.findFirst({
            where: and(
                eq(likes.message_id, messageId),
                eq(likes.liker_id, userId)
            ),
        });

        if (existingLike) {
            await db
                .delete(likes)
                .where(
                    and(
                        eq(likes.message_id, messageId),
                        eq(likes.liker_id, userId)
                    )
                );
            res.status(200).json({
                message: "Like removed",
                liked: false,
                likeId: existingLike.id,
            });
            return;
        }

        const [like] = await db
            .insert(likes)
            .values({
                liker_id: userId,
                message_id: messageId,
            })
            .returning();

        res.status(201).json({
            message: "Message liked",
            liked: true,
            likeId: like.id,
        });
        return;
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

export const getMessagesFromRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const roomId = Number(req.params.roomId);
        const beforeId = req.query.beforeId
            ? Number(req.query.beforeId)
            : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : 30;

        const room = await db.query.chatRooms.findFirst({
            where: eq(chatRooms.id, roomId),
        });

        if (!room) {
            res.status(404).json({
                error: `Chat room with id of ${roomId} not found`,
            });
            return;
        }

        const whereClause = beforeId
            ? and(eq(messages.roomId, roomId), lt(messages.id, beforeId))
            : eq(messages.roomId, roomId);

        const messagesResult = await db
            .select({
                id: messages.id,
                message: messages.message,
                created_at: messages.created_at,
                updated_at: messages.updated_at,
                deleted_at: messages.deleted_at,
                sender_id: messages.senderId,
                username: users.username,
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(whereClause)
            .orderBy(desc(messages.id))
            .limit(limit);

        const orderedMessages = messagesResult.reverse();

        res.status(200).json({
            messages: orderedMessages,
        });
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

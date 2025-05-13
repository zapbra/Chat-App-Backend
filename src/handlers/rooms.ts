import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { db } from "../db";
import { chatRooms, messages, users } from "../db/schema";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getUserCountInRoom } from "../services/SocketService";
import { getIO } from "../services/socket";

export const getRooms = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const rooms = await db
            .select({
                id: chatRooms.id,
                name: chatRooms.name,
                description: chatRooms.description,
                messageCount: sql<number>`COUNT(${messages.id})`,
                lastMessageAt: sql<Date | null>`MAX(${messages.created_at})`,
            })
            .from(chatRooms)
            .leftJoin(messages, eq(chatRooms.id, messages.roomId))
            .groupBy(chatRooms.id);

        const roomsWithUserCount = rooms.map((room) => {
            const activeUserCount = getUserCountInRoom(String(room.id));

            return {
                ...room,
                activeUserCount,
            };
        });

        res.status(200).json(roomsWithUserCount);
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

// GET /rooms/:id/?beforeId=<msgId>&limit=30

export const getRoomById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const roomId = Number(req.params.id);
        const beforeId = req.query.beforeId
            ? Number(req.query.beforeId)
            : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : 30;

        // make sure room exist in db
        const room = await db.query.chatRooms.findFirst({
            where: eq(chatRooms.id, roomId),
        });

        // throw error if room not found
        if (!room) {
            res.status(404).json({
                message: `Room with id of ${roomId} not found`,
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
        // return room and messages
        res.status(200).json({
            room,
            messages: orderedMessages,
        });
    } catch (error) {
        console.log(error);
        next(new CustomError("Internal server error", 500));
    }
};

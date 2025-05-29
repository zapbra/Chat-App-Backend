import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { db } from "../db";
import { chatRooms, likes, messages, users } from "../db/schema";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getUserCountInRoom } from "../services/SocketService";
import { getIO } from "../services/socket";
import { pubClient } from "../services/RedisClient";

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

        console.log("rooms");
        console.log(rooms);
        const roomsWithUserCount = await Promise.all(
            rooms.map(async (room) => {
                const activeUserCount = await getUserCountInRoom(
                    String(room.id)
                );

                return {
                    ...room,
                    activeUserCount,
                };
            })
        );

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

        const messagesResult = await db.execute(
            sql`
                 SELECT 
                messages.id,
                messages.message,
                messages.created_at,
                messages.updated_at,
                messages.deleted_at,
                messages.sender_id,
                message_users.username,

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
                WHERE messages.room_id = ${roomId}
                ORDER BY messages.id DESC
                LIMIT(${limit});`
        );
        // const messagesResult = await db
        //     .select({
        //         id: messages.id,
        //         message: messages.message,
        //         created_at: messages.created_at,
        //         updated_at: messages.updated_at,
        //         deleted_at: messages.deleted_at,
        //         sender_id: messages.senderId,
        //         username: users.username,
        //         like_id: likes.id,
        //         liker_id: likes.liker_id,
        //     })
        //     .from(messages)
        //     .innerJoin(users, eq(messages.senderId, users.id))
        //     .leftJoin(likes, eq(likes.message_id, messages.id))
        //     .where(whereClause)
        //     .orderBy(desc(messages.id))
        //     .limit(limit);

        const orderedMessages = messagesResult.rows.reverse();
        // return room and messages
        res.status(200).json({
            room,
            messages: orderedMessages,
        });
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

export const getRoomMembers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const roomId = Number(req.params.id);

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

        const members = await pubClient.sMembers(`room:${roomId}:members`);
        res.status(200).json({
            members,
        });
        return;
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

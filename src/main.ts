import cors from "cors";
import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { notFound } from "./middleware/not-found";
import { error } from "./middleware/error";
import usersRouter from "./routes/users";
import roomsRouter from "./routes/rooms";
import { MessageDataService } from "./services/MessageDataService";
import { getIO, initSocket } from "./services/socket";
import messageRouter from "./routes/messages";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { connectRedis } from "./services/RedisClient";
import jwt from "jsonwebtoken";
import followersRouter from "./routes/followers";
import directMessageRouter from "./routes/directMessages";
import { startRoomCleanup } from "./services/roomCleanup";

async function main() {
    const { pubClient, subClient } = await connectRedis();

    const app = express();
    const server = createServer(app);
    initSocket(server);
    const io = getIO();
    io.adapter(createAdapter(pubClient, subClient));

    startRoomCleanup(io, pubClient);

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const PORT = process.env.PORT || 3001;

    app.get("/", (_req, res) => {
        res.status(200).json({ message: "Hello from the server!" });
    });

    app.use("/api", usersRouter);
    app.use("/api/rooms", roomsRouter);
    app.use("/api/messages", messageRouter);
    app.use("/api/followers", followersRouter);
    app.use("/api/dms", directMessageRouter);

    app.use(notFound);
    app.use(error);

    io.on("connection", async (socket) => {
        console.log("📡 New connection, socket ID:", socket.id);
        console.log("Listening for join room events");

        const token = socket.handshake.auth.token;
        if (!token) {
            console.log("Missing token");
            socket.disconnect();
            return;
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!);
            if (typeof decoded !== "object" || !("id" in decoded)) {
                console.log("Invalid token");
                socket.disconnect();
                return;
            }
            const userId = (decoded as any).id;
            socket.data.userId = userId;
            socket.data.joinedRooms = new Set<string>();
            const userThreads = await MessageDataService.getAllUserDmThreads(
                userId
            );

            userThreads.forEach((thread) => {
                const room = `thread:${thread.threadId}`;
                socket.join(room);
                socket.data.joinedRooms.add(room);
            });
        } catch (err: any) {
            if (err.name === "TokenExpiredError") {
                console.log("Token has expired");
            } else {
                console.log("JWT verification failed:", err.message);
            }
            socket.disconnect();
        }

        socket.onAny((event, ...args) => {
            console.log(`🔎 Received event: ${event}`, args);
        });

        // Handle user joining room
        socket.on("join room", async (roomId: string) => {
            roomId = String(roomId);

            const roomKey = `room:${roomId}:members`;
            const exists = await pubClient.exists(roomKey);

            if (!exists) {
                await pubClient.sAdd("rooms:all", roomKey);
            }
            console.log(`user is attempting to join room ${roomId}`);

            // Get logged in/guest username provided by client
            const username = socket.handshake.auth.username;

            socket.data.joinedRooms.add(roomId);
            // Add user to room's set
            const expiryTimestamp = Date.now() + 5 * 60 * 1000;
            await pubClient.zAdd(roomKey, {
                score: expiryTimestamp,
                value: username,
            });

            // Join the room
            socket.join(roomId);

            const members = await pubClient.zRange(roomKey, 0, -1);
            // Broadcast updated members list
            io.to(roomId).emit("members:updated", members);

            console.log(`User ${username} has joined room ${roomId}`);
        });

        socket.on("leave room", async (roomId: string) => {
            roomId = String(roomId);
            const roomKey = `room:${roomId}:members`;
            const username = socket.handshake.auth.username;

            socket.data.joinedRooms.delete(roomId);
            // Remove user from room's Set
            await pubClient.zRem(roomKey, username);

            // Clean up empty room
            const memberCount = await pubClient.zCard(roomKey);
            if (memberCount === 0) {
                await pubClient.del(roomKey);
                await pubClient.sRem("rooms:all", roomKey);
            } else {
                // Broadcast updated members list
                const members = await pubClient.zRange(roomKey, 0, -1);
                io.to(roomId).emit("members:updated", members);
            }

            // Leave the room
            socket.leave(roomId);
            console.log(`User ${username} has left room ${roomId}`);
        });

        // Maybe add an indicator that the user is active in the chat, same for when they leave except vice-versa
        socket.on("join dm", async (threadId: string) => {
            threadId = String(threadId);
            console.log("User has joined dm with id of : " + threadId);
            socket.join(`thread:${threadId}`);
        });

        socket.on("leave dm", async (threadId: string) => {
            threadId = String(threadId);
            console.log("User has left dm with id of : " + threadId);
            socket.leave(`thread:${threadId}`);
        });

        socket.on(
            "dm message",
            async ({ senderId, receiverId, message, threadId }) => {
                // Add code to validation thread id is valid
                try {
                    const { message: newMessage, threadId: threadIdResponse } =
                        await MessageDataService.createDirectMessage(
                            senderId,
                            receiverId,
                            message,
                            threadId
                        );
                    console.log("new message");
                    console.log(newMessage);
                    if (newMessage) {
                        console.log(
                            `emitting dm message ${newMessage.message} to thread ${threadIdResponse}`
                        );
                        io.to(`thread:${threadIdResponse}`).emit("dm message", {
                            thread_id: threadIdResponse,
                            message: newMessage,
                        });
                    }
                } catch (error) {
                    console.log("error handling dm message: ", error);
                }
            }
        );
        socket.on(
            "chat message",
            async ({ roomId, senderId, username, message, replyId }) => {
                try {
                    console.log(
                        `User ${senderId}: ${username} sent message: ${message} in room ${roomId}`
                    );
                    const [createdMessage] =
                        await MessageDataService.createMessage(
                            roomId,
                            senderId,
                            message,
                            replyId
                        );
                    if (createdMessage) {
                        console.log(
                            `emitting message ${message} to room ${roomId}`
                        );
                        const replyMessage =
                            await MessageDataService.getMessageById(replyId);
                        io.to(roomId).emit("chat message", {
                            id: createdMessage.id,
                            message,
                            created_at: new Date().toISOString(),
                            sender_id: senderId,
                            username: username,
                            replying_to_id: replyMessage?.id,
                            replying_to_message: replyMessage?.message,
                            replying_to_created_at: replyMessage?.created_at,
                            replying_to_username:
                                replyMessage?.replying_to_username,
                        });
                    }
                } catch (error) {
                    console.error("Error handling chat message:", error);
                    // Optionally emit an error event to the client:
                }
            }
        );

        socket.on("disconnect", async () => {
            console.log("A user disconnected");
            const username = socket.handshake.auth.username;

            for (const roomId of socket.data.joinedRooms) {
                const roomKey = `room:${roomId}:members`;
                await pubClient.zRem(roomKey, username);
                const memberCount = await pubClient.zCard(roomKey);

                if (memberCount === 0) {
                    await pubClient.del(roomKey);
                    await pubClient.sRem("rooms:all", roomKey);
                } else {
                    const members = await pubClient.zRange(roomKey, 0, -1);
                    io.to(roomId).emit("members:updated", members);
                }
            }
        });
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

main().catch(console.error);

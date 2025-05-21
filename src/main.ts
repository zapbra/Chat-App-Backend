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

async function main() {
    const { pubClient, subClient } = await connectRedis();

    connectRedis().catch(console.error);

    const app = express();
    const server = createServer(app);
    initSocket(server);
    const io = getIO();
    io.adapter(createAdapter(pubClient, subClient));

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

    app.use(notFound);
    app.use(error);

    io.on("connection", async (socket) => {
        console.log("A user connected");

        socket.on("join room", async (roomId) => {
            // Get logged in/guest username provided by client
            const username = socket.handshake.auth.username;

            // Add user to room's set
            await pubClient.sAdd(`room:${roomId}:members`, username);

            // Join the room
            socket.join(roomId);

            const members = await pubClient.sMembers(`room:${roomId}:members`);
            // Broadcast updated members list
            io.to(roomId).emit("members:updated", members);

            console.log(`User ${username} has joined room ${roomId}`);
        });

        socket.on("leave room", async (roomId: string) => {
            const username = socket.handshake.auth.username;

            // Remove user from room's Set
            await pubClient.sRem(`room:${roomId}:members`, username);

            // Clean up empty room
            const memberCount = await pubClient.sCard(`room:${roomId}:members`);
            if (memberCount === 0) {
                await pubClient.del(`room:${roomId}:members`);
            } else {
                // Broadcast updated members list
                const members = await pubClient.sMembers(
                    `room:${roomId}:members`
                );
                io.to(roomId).emit("members:updated", members);
            }

            // Leave the room
            socket.leave(roomId);
            console.log(`User ${username} has left room ${roomId}`);
        });
        socket.on(
            "chat message",
            async ({ roomId, senderId, username, message }) => {
                try {
                    console.log(
                        `User ${senderId}: ${username} sent message: ${message} in room ${roomId}`
                    );
                    const [createdMessage] =
                        await MessageDataService.createMessage(
                            roomId,
                            senderId,
                            message
                        );
                    if (createdMessage) {
                        io.to(roomId).emit("chat message", {
                            id: createdMessage.id,
                            message,
                            created_at: new Date().toISOString(),
                            sender_id: senderId,
                            username: username,
                        });
                    }
                } catch (error) {
                    console.error("Error handling chat message:", error);
                    // Optionally emit an error event to the client:
                }
            }
        );
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

main().catch(console.error);

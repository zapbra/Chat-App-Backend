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

const app = express();
const server = createServer(app);
initSocket(server);
const io = getIO();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

app.get("/", (_req, res) => {
    res.status(200).json({ message: "Hello from the server!" });
});

app.use("/api", usersRouter);
app.use("/api/rooms", roomsRouter);

app.use(notFound);
app.use(error);

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("join room", (roomId) => {
        socket.join(String(roomId));
        console.log(`User ${socket.id} has joined room ${roomId}`);
    });

    socket.on("leave room", (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} has left room ${roomId}`);
    });
    socket.on(
        "chat message",
        async ({ roomId, senderId, username, message }) => {
            try {
                console.log(
                    `User ${senderId}: ${username} sent message: ${message} in room ${roomId}`
                );
                const [createdMessage] = await MessageDataService.createMessage(
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

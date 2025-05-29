import { Server } from "socket.io";
let io: Server;

export function initSocket(server: any) {
    console.log("Init socket instance");
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
        },
    });

    return io;
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

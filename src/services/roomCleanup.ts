import { RedisClientType } from "@redis/client";
import { Server } from "socket.io";

export function startRoomCleanup(io: Server, pubClient: RedisClientType) {
    setInterval(async () => {
        const now = Date.now();

        const roomKeys = await pubClient.sMembers("rooms:all"); // you need to implement this
        const roomIds = roomKeys
            .map((key) => {
                const match = key.match(/^room:(\d+):members$/);
                return match ? match[1] : null;
            })
            .filter((id): id is string => id !== null);

        for (const roomId of roomIds) {
            const expired = await pubClient.zRangeByScore(
                `room:${roomId}:members`,
                0,
                now
            );

            // Only remove if there are any expired users
            if (expired.length > 0) {
                await pubClient.zRem.apply(pubClient, [
                    `room:${roomId}:members`,
                    expired,
                ]);

                const updatedMembers = await pubClient.zRange(
                    `room:${roomId}:members`,
                    0,
                    -1
                );

                io.to(roomId).emit("members:updated", updatedMembers);
            }
        }
    }, 60 * 1000); // every minute
}

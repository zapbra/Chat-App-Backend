import { getRedisClients } from "./RedisClient";
import { getIO } from "./socket";

export const getUserCountInRoom = async (roomId: string) => {
    const { pubClient, subClient } = await getRedisClients();
    const memberCount = await pubClient.sCard(`room:${roomId}:members`);
    return memberCount;
};

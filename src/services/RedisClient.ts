import { createClient, RedisClientType } from "redis";

export type RedisClients = {
    pubClient: RedisClientType;
    subClient: RedisClientType;
};

const pubClient = createClient({
    username: "default",
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_PUBLIC_ENDPOINT!,
        port: Number(process.env.REDIS_PORT),
    },
}) as RedisClientType;
const subClient = pubClient.duplicate();

pubClient.on("error", (err: any) =>
    console.log("Redis Pub Client Error:", err)
);
subClient.on("error", (err: any) =>
    console.log("Redis Sub Client Error:", err)
);

let redisClients: RedisClients | null = null;

let isConnected = false;

export async function connectRedis() {
    if (!isConnected) {
        try {
            await Promise.all([pubClient.connect(), subClient.connect()]);
            isConnected = true;
        } catch (err) {
            throw err;
        }
    }
    return { pubClient, subClient };
}

export const getRedisClients = async () => {
    if (!isConnected) {
        return await connectRedis();
    }
    return { pubClient, subClient };
};

// Graceful shutdown
process.on("SIGTERM", async () => {
    await pubClient.quit();
    await subClient.quit();
});

export { pubClient, subClient };

export async function withRedis<T>(
    fn: (clients: RedisClients) => Promise<T>
): Promise<T> {
    const clients = await connectRedis();
    return fn(clients);
}

import { db } from "../db";
import { messages } from "../db/schema";
export class MessageDataService {
    static async createMessage(
        roomId: number,
        senderId: number,
        message: string
    ) {
        return await db
            .insert(messages)
            .values({ senderId, roomId, message })
            .returning();
    }
}

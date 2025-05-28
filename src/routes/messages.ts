import { Router } from "express";
import { verifyToken } from "../handlers/users";
import {
    getMessagesFromRoom,
    toggleLike,
    toggleReaction,
} from "../handlers/messages";

const messageRouter = Router();
messageRouter.get("/:id/like", verifyToken, toggleLike);
messageRouter.get("/room/:roomId", getMessagesFromRoom);
messageRouter.post("/:messageId/react", verifyToken, toggleReaction);

export default messageRouter;

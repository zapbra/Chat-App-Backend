import { Router } from "express";
import { verifyToken } from "../handlers/users";
import { getMessagesFromRoom, toggleLike } from "../handlers/messages";

const messageRouter = Router();
messageRouter.post("/:id/like", verifyToken, toggleLike);
messageRouter.get("/room/:roomId", getMessagesFromRoom);

export default messageRouter;

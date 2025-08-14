import { Router } from "express";
import { verifyToken } from "../handlers/users";
import {
    createThread,
    getDirectMessages,
    getUserThreads,
} from "../handlers/directMessages";

const directMessageRouter = Router();
directMessageRouter.get("/threads", verifyToken, getUserThreads);
directMessageRouter.get("/thread/:otherUserId", verifyToken, getDirectMessages);
directMessageRouter.post("/thread/:otherUserId", verifyToken, createThread);
// directMessageRouter.get("/thread/");
export default directMessageRouter;

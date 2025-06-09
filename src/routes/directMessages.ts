import { Router } from "express";
import { verifyToken } from "../handlers/users";

const directMessageRouter = Router();
directMessageRouter.get("/threads", verifyToken, getUserThreads);

export default directMessageRouter;

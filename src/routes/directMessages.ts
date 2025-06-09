import { Router } from "express";
import { verifyToken } from "../handlers/users";

const directMessagesRouter = Router();
directMessagesRouter.post("/threads", verifyToken, );

export default directMessagesRouter;

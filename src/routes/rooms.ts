import { Router } from "express";
import { getRoomById, getRoomMembers, getRooms } from "../handlers/rooms";

const roomsRouter = Router();
roomsRouter.get("/", getRooms);
roomsRouter.get("/:id", getRoomById);
roomsRouter.get("/:id/members", getRoomMembers);
export default roomsRouter;

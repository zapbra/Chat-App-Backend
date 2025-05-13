import { Router } from "express";
import { getRoomById, getRooms } from "../handlers/rooms";

const roomsRouter = Router();
roomsRouter.get("/", getRooms);
roomsRouter.get("/:id", getRoomById);

export default roomsRouter;

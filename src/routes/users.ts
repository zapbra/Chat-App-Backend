import { Router } from "express";
import {
    signUp,
    login,
    getUserDetails,
    verifyToken,
    refreshToken,
} from "../handlers/users";

const usersRouter = Router();
usersRouter.post("/signup", signUp);
usersRouter.post("/login", login);
usersRouter.post("/refresh", refreshToken);
usersRouter.get("/user", verifyToken, getUserDetails);
export default usersRouter;

import { Router } from "express";
import {
    signUp,
    login,
    getUserDetails,
    verifyToken,
    refreshToken,
    testAuthMethod,
    getUserMessages,
} from "../handlers/users";

const usersRouter = Router();
usersRouter.post("/signup", signUp);
usersRouter.post("/login", login);
usersRouter.get("/refresh", refreshToken);
usersRouter.get("/user", verifyToken, getUserDetails);
usersRouter.get("/users/:userId/messages", getUserMessages);
usersRouter.get("/test-auth", verifyToken, testAuthMethod);
export default usersRouter;

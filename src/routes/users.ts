import { Router } from "express";
import {
    signUp,
    login,
    getUserDetails,
    verifyToken,
    refreshToken,
    testAuthMethod,
    getUserMessages,
    getAllUsers,
    searchUsers,
    getUserById,
} from "../handlers/users";

const usersRouter = Router();
usersRouter.post("/signup", signUp);
usersRouter.post("/login", login);
usersRouter.get("/refresh", refreshToken);
usersRouter.get("/user", verifyToken, getUserDetails);
usersRouter.get("/users/:userId", getUserById);
usersRouter.get("/users/:userId/messages", getUserMessages);
usersRouter.get("/test-auth", verifyToken, testAuthMethod);
usersRouter.get("/users", getAllUsers);
usersRouter.post("/search", searchUsers);
export default usersRouter;

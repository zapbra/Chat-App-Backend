import {
    getUserFollowerCount,
    getUserFollowingCount,
    getUserFollowers,
    getUserFollowing,
    toggleFollow,
} from "../handlers/followers";
import { Router } from "express";
import { isUserFollowing, verifyToken } from "../handlers/users";

const followersRouter = Router();
followersRouter.get("/:userId/follower-count", getUserFollowerCount);
followersRouter.get("/:userId/following-count", getUserFollowingCount);
followersRouter.get("/:userId/followers", getUserFollowers);
followersRouter.get("/:userId/following", getUserFollowing);
followersRouter.get("/:userId/is-following", verifyToken, isUserFollowing);
followersRouter.post("/follow", verifyToken, toggleFollow);

export default followersRouter;

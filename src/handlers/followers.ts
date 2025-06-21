import { and, count, eq, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { followers, users } from "../db/schema";
import { CustomError } from "../lib/custom-error";

export const getUserFollowerCount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const result = await db
            .select({ count: count() })
            .from(followers)
            .where(eq(followers.following_id, userId));

        const followerCount = result[0]?.count ?? 0;

        res.status(200).json({
            followerCount,
        });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(
                new CustomError(
                    `Unknown error while getting user follower count`,
                    500
                )
            );
        }
    }
};

export const getUserFollowingCount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const result = await db
            .select({ count: count() })
            .from(followers)
            .where(eq(followers.follower_id, userId));

        const followingCount = result[0]?.count ?? 0;

        res.status(200).json({
            followingCount,
        });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(
                new CustomError(
                    `Unknown error while getting user follower count`,
                    500
                )
            );
        }
    }
};

// Update this function to filter the users in batches and possibly different filter types for latest, etc
// Same with the getUserFollowing function below
export const getUserFollowers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }
    try {
        const result = await db
            .select({
                id: followers.id,
                following_id: followers.following_id,
                follower_id: followers.follower_id,
                username: users.username,
            })
            .from(followers)
            .leftJoin(users, eq(users.id, followers.follower_id))
            .where(eq(followers.following_id, userId));

        res.status(200).json({ followers: result });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(
                new CustomError(
                    `Unknown error while getting user follower list`,
                    500
                )
            );
        }
    }
};

export const getUserFollowing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const result = await db
            .select({
                id: followers.id,
                following_id: followers.following_id,
                follower_id: followers.follower_id,
                username: users.username,
            })
            .from(followers)
            .leftJoin(users, eq(users.id, followers.following_id))
            .where(eq(followers.follower_id, userId));

        res.status(200).json({
            following: result,
        });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(
                new CustomError(
                    `Unknown error while getting user following list`,
                    500
                )
            );
        }
    }
};

export const toggleFollow = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = Number(req.body.userId);
    if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        if (!req.user?.id) {
            throw new Error("Unauthorized: Missing user id");
        }
        const loggedInUserId = req.user.id;

        // Need to check if user is already following
        // If following, them remove follow
        const followResult = await db
            .select({ id: followers.id })
            .from(followers)
            .where(
                and(
                    eq(followers.follower_id, loggedInUserId),
                    eq(followers.following_id, userId)
                )
            )
            .limit(1);

        const isFollowing = followResult.length > 0;

        // Remove follow and exit function
        if (isFollowing) {
            await db
                .delete(followers)
                .where(eq(followers.id, followResult[0].id));
            res.status(200).json({ following: false });
            return;
        }

        const insertedFollow = await db
            .insert(followers)
            .values({ follower_id: loggedInUserId, following_id: userId })
            .returning();

        if (insertedFollow.length > 0) {
            res.status(200).json({ following: true });
            return;
        }

        res.status(404).json({ message: "Failed to follow user" });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Unknown error while toggling follow`, 500));
        }
    }
};

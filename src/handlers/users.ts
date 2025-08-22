import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { followers, messages, users } from "../db/schema";
import { db } from "../db/index";
import { and, eq, ilike, or } from "drizzle-orm";
import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import { rawListeners } from "process";

interface AuthPayload extends JwtPayload {
    email: string;
    id: number;
}

export const refreshToken: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        res.status(406).json({ message: "Unauthorized" });
        return;
    }

    const refreshToken = authHeader.split(" ")[1];

    jwt.verify(refreshToken, "secret", (err: any, decoded: any) => {
        if (err) {
            // Wrong Refesh Token
            res.status(406).json({ message: "Unauthorized" });
            return;
        } else {
            const { email, id } = decoded as { email: string; id: string };
            // Correct token we send a new access token
            const accessToken = jwt.sign(
                {
                    email: email,
                    id: id,
                },
                "secret",
                {
                    expiresIn: "1H",
                }
            );
            res.status(200).json({ accessToken });
            return;
        }
    });
};
// Middleware for JWT validation
export const verifyToken = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    // Update this 'secret' to an actual secret
    jwt.verify(token, "secret", (err, decoded) => {
        if (
            err ||
            typeof decoded !== "object" ||
            decoded === null ||
            !("email" in decoded)
        ) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        req.user = decoded as AuthPayload;
        next();
    });
};

export const signUp: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Check if user exists
        let user = await db.query.users.findFirst({
            where: or(
                eq(users.username, req.body.username),
                eq(users.email, req.body.email)
            ),
        });
        // throw error is user exists
        if (user) {
            res.status(409).json({
                message: "User already exists with that email or username",
            });
            return;
        }

        console.log("About to crypt password");
        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password_hash, 10);

        console.log("hashed password");
        console.log(hashedPassword);
        // Create new user
        const inserted = await db
            .insert(users)
            .values({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                username: req.body.username,
                email: req.body.email,
                password_hash: hashedPassword,
            })
            .returning();
        user = inserted[0];
        const accessToken = jwt.sign(
            { email: user.email, id: user.id } /* Change to user id */,
            "secret",
            { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
            { email: user.email, id: user.id } /* Change to user id */,
            "secret",
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully",
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.log("Failed to sign up");
        console.log(error);
        next(new CustomError("Failed to signup", 500));
    }
};

export const testAuthMethod = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const email = req.user!.email;
        res.status(201).json({ email });
        return;
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Check if user exists
        let user = await db.query.users.findFirst({
            where: or(
                eq(users.username, req.body.email),
                eq(users.email, req.body.email)
            ),
        });
        if (!user) {
            res.status(401).json({
                message: "Invalid credentials. Wrong Email",
            });
            return;
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(
            req.body.password,
            user.password_hash
        );

        if (!passwordMatch) {
            res.status(401).json({
                message: "Invalid credentials. Wrong password",
            });
            return;
        } else {
        }

        const accessToken = jwt.sign(
            { email: user.email, id: user.id },
            "secret",
            { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
            { email: user.email, id: user.id },
            "secret",
            { expiresIn: "7d" }
        );
        res.status(200).json({
            message: "Login successful",
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

export const getUserDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, req.user!.email),
        });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({
            username: user.username,
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
        });
    } catch (error) {
        next(new CustomError("Internal server error", 500));
    }
};

export const getUserMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = Number(req.params.userId);

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            res.status(404).json({
                error: `User with id of ${userId} does not exist`,
            });
        }
        const messagesResponse = await db.query.messages.findMany({
            where: eq(messages.senderId, userId),
        });

        res.status(200).json({
            messages: messagesResponse,
        });
        return;
    } catch (error) {
        next(new CustomError(`Internal server error: ${error}`, 500));
    }
};

export const getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await db.select().from(users);
        res.status(200).json({ users: result });
        return;
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Unknown error`, 500));
        }
    }
};

export const searchUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.body.search) {
            res.status(400).json({ error: "Missing search body parameter" });
            return;
        }

        const search = `${req.body.search}%`;

        const result = await db
            .select({ id: users.id, username: users.username })
            .from(users)
            .where(ilike(users.username, search));

        res.status(200).json({ users: result });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Unknown error`, 500));
        }
    }
};

export const getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = Number(req.params.userId);

        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        const [user] = await db
            .select({
                firstName: users.first_name,
                lastName: users.last_name,
                username: users.username,
                email: users.email,
                created_at: users.created_at,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            res.status(404).json({
                error: `User not found with id of ${userId}`,
            });
            return;
        }
        res.status(200).json({ user });
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Unknown error while geting user by id`, 500));
        }
    }
};

export const isUserFollowing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user?.id) {
            res.status(400).json({ error: "User is not authorized" });
            return;
        }
        const loggedInUserId = req.user.id;

        const userId = Number(req.params.userId);

        if (isNaN(userId)) {
            res.status(401).json({ error: "Invalid user ID" });
            return;
        }

        const follow = await db
            .select({ id: followers.id })
            .from(followers)
            .where(
                and(
                    eq(followers.following_id, userId),
                    eq(followers.follower_id, loggedInUserId)
                )
            )
            .limit(1);

        const following = follow.length > 0;

        res.status(200).json({ following });
        return;
    } catch (error) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(
                new CustomError(
                    `Unknown error while checking if user is following`,
                    500
                )
            );
        }
    }
};

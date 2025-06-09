import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/custom-error";
import { dmThreads } from "../db/schema";
import { db } from "../db";

export const createDmThread = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const [thread] = await db.insert(dmThreads).values({}).returning();
        
    } catch (error: any) {
        if (error instanceof Error) {
            next(
                new CustomError(`Internal server error: ${error.message}`, 500)
            );
        } else {
            next(new CustomError(`Internal server error`, 500));
        }
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_kit_1 = require("drizzle-kit");
exports.default = (0, drizzle_kit_1.defineConfig)({
    out: "./drizzle",
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});

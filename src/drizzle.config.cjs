const { defineConfig } = require("drizzle-kit");
module.exports = defineConfig({
    dialect: "postgresql",
    schema: "src/db/schema.ts",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});

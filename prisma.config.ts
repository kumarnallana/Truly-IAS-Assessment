import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Runtime traffic uses Neon's pooled hostname. Schema/admin commands use
    // the direct connection when it is configured.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});

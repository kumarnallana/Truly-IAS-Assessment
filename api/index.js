import "dotenv/config";
import { prisma } from "../server/lib/prisma.js";
import app from "../server/app.js";

// Ensure Prisma singleton is initialized on cold start
export { prisma };

export default app;

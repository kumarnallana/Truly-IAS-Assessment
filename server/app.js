import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { env } from "./lib/env.js";
import registrationRoutes from "./routes/registration.routes.js";
import mfaRoutes from "./routes/mfa.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & scripts for local demo
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || origin === env.CLIENT_ORIGIN) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20kb" }));

// Mount API routes
app.use("/api", registrationRoutes);
app.use("/api", mfaRoutes);

// Serve static frontend in development / standalone mode
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

// Central error handler
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    const fieldErrors = {};
    for (const issue of err.issues) {
      const field = issue.path[0] || "form";
      fieldErrors[field] = issue.message;
    }
    return res.status(400).json({
      message: err.issues[0]?.message || "Validation error.",
      details: fieldErrors,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error." : err.message;
  if (statusCode === 500) {
    console.error("[ServerError]", err);
  }

  res.status(statusCode).json({
    message,
    details: err.details,
  });
});

export default app;

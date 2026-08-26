import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { env } from "./lib/env.js";
import { issueCsrfToken, requireCsrf } from "./lib/csrf.js";
import registrationRoutes from "./routes/registration.routes.js";
import mfaRoutes from "./routes/mfa.routes.js";
import authRoutes from "./routes/auth.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", env.CLIENT_ORIGIN],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

const allowedOrigins = new Set([
  env.CLIENT_ORIGIN,
  `http://localhost:${env.PORT}`,
  `http://127.0.0.1:${env.PORT}`,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(Object.assign(new Error("Request origin is not allowed."), { statusCode: 403, code: "ORIGIN_REJECTED" }));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20kb" }));

app.get("/api/csrf", issueCsrfToken);
app.use("/api", requireCsrf);

// Mount API routes
app.use("/api", registrationRoutes);
app.use("/api", mfaRoutes);
app.use("/api", authRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "API endpoint not found." });
});

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
      code: "VALIDATION_ERROR",
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
    code: err.code || (statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED"),
    message,
    details: err.details,
  });
});

export default app;

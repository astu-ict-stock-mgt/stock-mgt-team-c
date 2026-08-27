import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { config } from "./config";
import { attachAuth, AuthedRequest, AppError } from "./middleware/auth";
import { ok, fail } from "./utils/response";
import { prisma } from "./config/db";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import suppliersRoutes from "./routes/suppliers";
import inventoryRoutes from "./routes/inventory";
import receiptsRoutes from "./routes/receipts";
import issuesRoutes from "./routes/issues";
import transfersRoutes from "./routes/transfers";
import rolesRoutes from "./routes/roles";
import auditLogsRoutes from "./routes/audit-logs";
import reportsRoutes from "./routes/reports";
import notificationsRoutes from "./routes/notifications";
import dashboardRoutes from "./routes/dashboard";
import requisitionsRoutes from "./routes/requisitions";
import stockTakesRoutes from "./routes/stocktakes";
import gatePassesRoutes from "./routes/gate-passes";
import printRoutes from "./routes/print";
import { dispositionRouter } from "./routes/dispositions";

const app = express();

// Trust proxy (for correct req.ip behind reverse proxy)
app.set("trust proxy", 1);

// Security
app.use(helmet());
app.use(compression());

// Login attempts are counted per IP *and* email, not per IP alone. ASTU users
// share one public address through NAT, so a flat per-IP cap of 5 meant the whole
// campus was locked out for the window after five sign-ins anywhere. Per-account
// brute force is already handled by the lockout in services/auth.ts.
const loginRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // An IPv6 client can rotate freely inside its own /64, so the address is
    // truncated to that prefix before it becomes part of the key.
    const raw = req.ip ?? "";
    const ip = raw.includes(":") ? raw.split(":").slice(0, 4).join(":") : raw;
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return email ? `${ip}:${email}` : ip;
  },
  message: fail("RATE_LIMIT_EXCEEDED", "Too many login attempts for this account, please try again later"),
});

const apiRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.max(config.rateLimit.max * 10, 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: fail("RATE_LIMIT_EXCEEDED", "Too many requests, please try again later"),
});

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — must sit after body parsing, because the login limiter keys
// on req.body.email and would otherwise see an unparsed body every time.
app.use("/api/v1/auth/login", loginRateLimit);
app.use("/api/v1", apiRateLimit);

// Logging
app.use(morgan(config.isProd ? "combined" : "dev"));

// Attach auth context (resolves session token if present)
app.use(attachAuth as any);

// Health check
app.get("/api/v1/health", async (_req: Request, res: Response) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    console.error("[health] DB check failed", e);
  }
  res.json(ok({
    status: dbOk ? "healthy" : "degraded",
    database: dbOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  }, dbOk ? "healthy" : "degraded"));
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/suppliers", suppliersRoutes);
app.use("/api/v1", inventoryRoutes); // categories, stores, inventory
app.use("/api/v1/receipts", receiptsRoutes);
app.use("/api/v1/issues", issuesRoutes);
app.use("/api/v1/transfers", transfersRoutes);
app.use("/api/v1/roles", rolesRoutes);
app.use("/api/v1/audit-logs", auditLogsRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/requisitions", requisitionsRoutes);
app.use("/api/v1/stocktakes", stockTakesRoutes);
app.use("/api/v1/gate-passes", gatePassesRoutes);
// Damaged and obsolete stock are the same table shape, so one router factory
// serves both under its own permission.
app.use("/api/v1/damaged", dispositionRouter("damaged", "damaged.manage"));
app.use("/api/v1/obsolete", dispositionRouter("obsolete", "obsolete.manage"));
app.use("/api/v1/print", printRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json(fail("NOT_FOUND", "Endpoint not found"));
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }
  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(422).json(fail("VALIDATION_ERROR", "Validation failed", err.flatten()));
  }
  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json(fail("DUPLICATE", "A record with this unique field already exists"));
  }
  if (err.code === "P2025") {
    return res.status(404).json(fail("NOT_FOUND", "Record not found"));
  }
  // Never echo raw error text to the client — Prisma messages embed absolute
  // server paths and source snippets. The full error goes to the server log;
  // outside production the client gets the error name only, as a hint.
  console.error("[unhandled]", err);
  res.status(500).json(fail(
    "INTERNAL_ERROR",
    "Internal server error",
    config.isProd ? undefined : { type: err?.name ?? "Error" }
  ));
});

export default app;

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
import storesRoutes from "./routes/stores";
import locationsRoutes from "./routes/locations";
import shelvesRoutes from "./routes/shelves";
import binsRoutes from "./routes/bins";
import receiptsRoutes from "./routes/receipts";
import grnsRoutes from "./routes/grns";
import issuesRoutes from "./routes/issues";
import transfersRoutes from "./routes/transfers";
import rolesRoutes from "./routes/roles";
import auditLogsRoutes from "./routes/audit-logs";
import reportsRoutes from "./routes/reports";
import notificationsRoutes from "./routes/notifications";
import dashboardRoutes from "./routes/dashboard";
import requisitionsRoutes from "./routes/requisitions";

const app = express();

// Trust proxy (for correct req.ip behind reverse proxy)
app.set("trust proxy", 1);

// Security
app.use(helmet());
app.use(compression());

const loginRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: fail("RATE_LIMIT_EXCEEDED", "Too many login attempts, please try again later"),
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

// Rate limiting
app.use("/api/v1/auth/login", loginRateLimit);
app.use("/api/v1", apiRateLimit);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/v1", inventoryRoutes); // categories, inventory
app.use("/api/v1/stores", storesRoutes);
app.use("/api/v1/locations", locationsRoutes);
app.use("/api/v1/shelves", shelvesRoutes);
app.use("/api/v1/bins", binsRoutes);
app.use("/api/v1/goods-receipts", receiptsRoutes);
app.use("/api/v1/grns", grnsRoutes);
app.use("/api/v1/issues", issuesRoutes);
app.use("/api/v1/transfers", transfersRoutes);
app.use("/api/v1/roles", rolesRoutes);
app.use("/api/v1/audit-logs", auditLogsRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/requisitions", requisitionsRoutes);

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
  console.error("[unhandled]", err);
  res.status(500).json(fail("INTERNAL_ERROR", config.isProd ? "Internal server error" : err.message));
});

export default app;

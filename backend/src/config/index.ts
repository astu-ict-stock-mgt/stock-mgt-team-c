import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    // Per IP+email, so this is a per-account ceiling rather than a shared one.
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "10", 10),
  },
};

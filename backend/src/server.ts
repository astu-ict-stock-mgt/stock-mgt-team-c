import app from "./app";
import { config } from "./config";
import { purgeExpiredSessions } from "./services/auth";

const server = app.listen(config.port, () => {
  console.log(`🚀 ASTU Stock Management API running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   CORS origin: ${config.cors.origin}`);
  console.log(`   Health: http://localhost:${config.port}/api/v1/health`);
});

// Sweep expired sessions hourly so the table does not grow without bound, and
// once at boot to clear whatever accumulated while the process was down.
const SESSION_SWEEP_MS = 60 * 60 * 1000;
const sweepSessions = () =>
  purgeExpiredSessions()
    .then((count) => { if (count > 0) console.log(`[sessions] purged ${count} expired session(s)`); })
    .catch((err) => console.error("[sessions] purge failed", err));

const sessionSweep = setInterval(sweepSessions, SESSION_SWEEP_MS);
sessionSweep.unref();
void sweepSessions();

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  clearInterval(sessionSweep);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

export default server;

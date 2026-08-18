import app from "./app";
import { config } from "./config";

const server = app.listen(config.port, () => {
  console.log(`🚀 ASTU Stock Management API running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   CORS origin: ${config.cors.origin}`);
  console.log(`   Health: http://localhost:${config.port}/api/v1/health`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
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

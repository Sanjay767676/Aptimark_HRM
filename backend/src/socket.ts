import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { logger } from "./lib/logger";

export function setupSocketServer(httpServer: HttpServer, app: any) {
  const isDev = process.env["NODE_ENV"] !== "production";
  
  const allowedOrigins = (process.env["CORS_ORIGINS"] ?? process.env["FRONTEND_ORIGIN"] ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isDev) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    // Optional basic authentication using WEBSOCKET_SECRET
    const secret = process.env.WEBSOCKET_SECRET;
    const clientSecret = socket.handshake.auth.token;
    
    if (secret && clientSecret !== secret) {
      return next(new Error("Authentication error"));
    }
    next();
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Attach io to the express app so it can be used in routes
  app.set("io", io);

  return io;
}

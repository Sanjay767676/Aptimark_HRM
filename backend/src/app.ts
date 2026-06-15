import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

const allowedOrigins = (process.env["CORS_ORIGINS"] ?? process.env["FRONTEND_ORIGIN"] ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const isDev = process.env["NODE_ENV"] !== "production";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isDev) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    quietReqLogger: true,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "silent";
    },
    customErrorMessage: (req, res, err) => {
      const detail = err instanceof Error ? err.message : "request failed";
      return `${req.method} ${req.url?.split("?")[0]} ${res.statusCode} — ${detail}`;
    },
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
      err(err) {
        return { type: err.name, message: err.message };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory for PDFs
const publicPath = path.join(__dirname, "../public");
app.use("/public", express.static(publicPath));

app.use("/api", router);

export default app;

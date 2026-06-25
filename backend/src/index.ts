import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureDatabaseConnection } from "./lib/ensure-db";
import { setupSocketServer } from "./socket";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await ensureDatabaseConnection();

const server = http.createServer(app);
setupSocketServer(server, app);

server.listen(port, (err?: any) => {
  if (err) {
    logger.error(`Server failed to start: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  logger.info(`Server listening on port ${port}`);
});

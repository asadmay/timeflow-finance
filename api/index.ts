import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api")) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Vercel: every cold start is a new process, so we register routes immediately
const httpServer = createServer(app);
let ready: Promise<void> | null = null;

function getReady() {
  if (!ready) {
    ready = registerRoutes(httpServer, app).catch((err) => {
      console.error("Failed to register routes:", err);
      ready = null; // allow retry
      throw err;
    });
  }
  return ready;
}

// Global error handler (must be last)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Unhandled error:", err);
  if (!res.headersSent) res.status(status).json({ message });
});

export default async function handler(req: Request, res: Response) {
  try {
    await getReady();
  } catch (err) {
    return res.status(500).json({ message: "Server initialization failed" });
  }
  return new Promise<void>((resolve) => {
    // @ts-ignore
    app(req, res, () => resolve());
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
  });
}

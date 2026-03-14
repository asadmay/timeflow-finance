import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

const routesReady: Promise<void> = registerRoutes(httpServer, app).then(() => {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[api] error:", err);
    if (!res.headersSent) res.status(status).json({ message });
  });
}).catch((err) => {
  console.error("[api] Failed to register routes:", err);
  throw err;
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await routesReady;
  } catch (err) {
    return res.status(500).json({ message: "Server initialization failed", error: String(err) });
  }

  // Restore full path so Express can match /api/... routes
  const url = req.url || "/";
  if (!url.startsWith("/api")) {
    (req as any).url = "/api/" + (req as any).query.path?.join("/") || "/api";
  }

  return new Promise<void>((resolve) => {
    app(req as any, res as any, () => resolve());
    res.on("finish", resolve);
    res.on("close", resolve);
  });
}

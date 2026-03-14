import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

// Initialize routes once at module load (Vercel reuses the module between requests)
const routesReady: Promise<void> = registerRoutes(httpServer, app).then(() => {
  // Error handler MUST be registered after all routes
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

export default async function handler(req: Request, res: Response) {
  try {
    await routesReady;
  } catch (err) {
    return res.status(500).json({ message: "Server initialization failed", error: String(err) });
  }

  // Vercel strips the /api prefix from req.url — restore it so Express can match routes
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  return new Promise<void>((resolve) => {
    // @ts-ignore
    app(req, res, () => resolve());
    res.on("finish", resolve);
    res.on("close", resolve);
  });
}

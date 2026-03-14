import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;
  const server = createServer(app);
  await registerRoutes(server, app);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (!res.headersSent) res.status(status).json({ message: err.message || "Internal Server Error" });
  });
}
const initPromise = init().catch(console.error);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initPromise;

  // Reconstruct full /api/... path from Vercel's catch-all query param
  const pathArr = (req.query.path as string[]) || [];
  req.url = "/api/" + pathArr.join("/");
  const qs = Object.entries(req.query)
    .filter(([k]) => k !== "path")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  if (qs) req.url += "?" + qs;

  return new Promise<void>((resolve) => {
    app(req as any, res as any, () => resolve());
    res.on("finish", resolve);
    res.on("close", resolve);
  });
}

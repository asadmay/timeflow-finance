import express from "express";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(
  express.json({
    limit: "20mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

registerRoutes({} as any, app).catch(console.error);

export default app;

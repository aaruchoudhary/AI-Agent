import express from "express";

import { generateRouter } from "./api/routes/generate";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", generateRouter);
  return app;
}

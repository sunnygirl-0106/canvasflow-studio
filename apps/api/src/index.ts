import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { scripts } from "./routes/scripts";
import { assets } from "./routes/assets";
import { projects } from "./routes/projects";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }));

app.route("/api/scripts", scripts);
app.route("/api/assets", assets);
app.route("/api/projects", projects);

app.get("/api/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
console.log(`CanvasFlow API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

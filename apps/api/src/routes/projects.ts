import { Hono } from "hono";
import {
  listProjects,
  getProject,
  upsertProject,
  createProject,
} from "../db/projectRepo";
import { SaveProjectBody, CreateProjectBody } from "../schemas/project";

export const projects = new Hono();

/** GET /api/projects — list all projects */
projects.get("/", (c) => {
  return c.json(listProjects());
});

/** GET /api/projects/:id — get project with full canvas */
projects.get("/:id", (c) => {
  const row = getProject(c.req.param("id"));
  if (!row) return c.json({ error: "Project not found" }, 404);

  const canvas = JSON.parse(row.canvas);
  return c.json({
    id: row.id,
    name: row.name,
    canvas,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

/** PUT /api/projects/:id — upsert project */
projects.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = SaveProjectBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const id = c.req.param("id");
  upsertProject(id, parsed.data.name, JSON.stringify(parsed.data.canvas));
  return c.json({ ok: true });
});

/** POST /api/projects — create new project */
projects.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = CreateProjectBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const id = `proj-${crypto.randomUUID().slice(0, 8)}`;
  const row = createProject(id, parsed.data.name);
  return c.json(
    {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    201,
  );
});

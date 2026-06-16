import { db } from "./connection";

export interface ProjectRow {
  id: string;
  name: string;
  canvas: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

const listStmt = db.prepare(
  "SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC",
);

const getByIdStmt = db.prepare("SELECT * FROM projects WHERE id = ?");

const upsertStmt = db.prepare(`
  INSERT INTO projects (id, name, canvas, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    name       = excluded.name,
    canvas     = excluded.canvas,
    updated_at = datetime('now')
`);

const createStmt = db.prepare(
  "INSERT INTO projects (id, name) VALUES (?, ?)",
);

const removeStmt = db.prepare("DELETE FROM projects WHERE id = ?");

export function listProjects(): ProjectSummary[] {
  const rows = listStmt.all() as Pick<ProjectRow, "id" | "name" | "updated_at">[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_at,
  }));
}

export function getProject(id: string): ProjectRow | undefined {
  return getByIdStmt.get(id) as ProjectRow | undefined;
}

export function upsertProject(id: string, name: string, canvas: string): void {
  upsertStmt.run(id, name, canvas);
}

export function createProject(id: string, name: string): ProjectRow {
  createStmt.run(id, name);
  return getByIdStmt.get(id) as ProjectRow;
}

export function removeProject(id: string): void {
  removeStmt.run(id);
}

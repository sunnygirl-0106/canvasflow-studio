import { z } from "zod";

export const SaveProjectBody = z.object({
  name: z.string().min(1).max(200),
  canvas: z
    .object({
      nodes: z.array(z.looseObject({})),
      edges: z.array(z.looseObject({})),
    })
    .check(
      z.refine((c) => {
        const json = JSON.stringify(c);
        return !json.includes("data:image/");
      }, "canvas must not contain base64 image data"),
    ),
});

export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
});

export type SaveProjectInput = z.infer<typeof SaveProjectBody>;
export type CreateProjectInput = z.infer<typeof CreateProjectBody>;

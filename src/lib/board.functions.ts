import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function db() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const status = z.enum(["todo", "in_progress", "done"]);
const priority = z.enum(["low", "medium", "high"]);

export const getBoard = createServerFn({ method: "GET" }).handler(async () => {
  const s = db();
  const project = check(await s.from("projects").select("id, name").order("created_at").limit(1).single());
  const tasks = check(
    await s
      .from("tasks")
      .select("id, title, description, priority, status, due_date, assignee_id, position")
      .eq("project_id", project.id)
      .order("position"),
  );
  const pm = check(
    await s.from("project_members").select("role, members(id, name, color)").eq("project_id", project.id),
  );
  const members = pm
    .filter((r) => r.members)
    .map((r) => ({ ...(r.members as { id: string; name: string; color: string }), role: r.role }));
  return { project, tasks, members };
});

export const createTask = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        project_id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).default(""),
        priority,
        due_date: z.string().nullable(),
        assignee_id: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    check(await db().from("tasks").insert({ ...data, status: "todo", position: Date.now() }));
    return { ok: true };
  });

export const moveTask = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), status }).parse(d))
  .handler(async ({ data }) => {
    check(await db().from("tasks").update({ status: data.status, position: Date.now() }).eq("id", data.id));
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    check(await db().from("tasks").delete().eq("id", data.id));
    return { ok: true };
  });

const palette = ["oklch(0.72 0.14 50)", "oklch(0.7 0.12 180)", "oklch(0.68 0.13 250)", "oklch(0.74 0.13 120)", "oklch(0.7 0.14 330)"];

export const addMember = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        project_id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        role: z.enum(["owner", "editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = db();
    const color = palette[Math.floor(Math.random() * palette.length)];
    const m = check(await s.from("members").insert({ name: data.name, color }).select("id").single());
    check(await s.from("project_members").insert({ project_id: data.project_id, member_id: m.id, role: data.role }));
    return { ok: true };
  });

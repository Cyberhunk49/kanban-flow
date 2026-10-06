import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus, UserPlus, Trash2, Calendar, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getBoard, createTask, moveTask, deleteTask, addMember } from "@/lib/board.functions";
import { countByStatus, inProgressByMember, isOverloaded, type Priority, type Status } from "@/lib/workload";
import { cn } from "@/lib/utils";

const boardQuery = queryOptions({ queryKey: ["board"], queryFn: () => getBoard() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kanban Board — Tasks & Workload Balancing" },
      { name: "description", content: "Organize team tasks across To-Do, In Progress and Done, with burnout warnings." },
      { property: "og:title", content: "Kanban Board — Tasks & Workload Balancing" },
      { property: "og:description", content: "Drag-and-drop Kanban with priority filters and workload balancing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQuery),
  component: Board,
  errorComponent: ({ error }) => <div role="alert" className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Board not found.</div>,
});

type Board = Awaited<ReturnType<typeof getBoard>>;
type Task = Board["tasks"][number];
type Member = Board["members"][number];

const COLUMNS: { id: Status; label: string }[] = [
  { id: "todo", label: "To-Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];
const PRIO_CLASS: Record<Priority, string> = {
  high: "bg-prio-high text-primary-foreground",
  medium: "bg-prio-medium text-foreground",
  low: "bg-prio-low text-primary-foreground",
};

function initials(n: string) {
  return n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function Board() {
  const { data } = useSuspenseQuery(boardQuery);
  const qc = useQueryClient();
  const router = useRouter();
  const move = useServerFn(moveTask);
  const [filter, setFilter] = useState<Priority | "all">("all");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const refresh = () => qc.invalidateQueries({ queryKey: ["board"] }).then(() => router.invalidate());
  const visible = data.tasks.filter((t) => filter === "all" || t.priority === filter);
  const counts = countByStatus(visible);
  const load = inProgressByMember(data.tasks);
  const memberById = new Map(data.members.map((m) => [m.id, m]));

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const to = e.over?.id as Status | undefined;
    const task = data.tasks.find((t) => t.id === id);
    if (!to || !task || task.status === to) return;
    qc.setQueryData<Board>(["board"], (b) =>
      b ? { ...b, tasks: b.tasks.map((t) => (t.id === id ? { ...t, status: to } : t)) } : b,
    );
    try {
      await move({ data: { id, status: to } });
    } catch {
      toast.error("Couldn't move task");
    }
    refresh();
  }

  return (
    <div className="min-h-screen font-sans">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Project</p>
            <h1 className="font-display text-3xl font-bold">{data.project.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-background p-1" role="group" aria-label="Filter by priority">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm capitalize transition-colors",
                    filter === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <AddMemberDialog projectId={data.project.id} onDone={refresh} />
            <NewTaskDialog projectId={data.project.id} members={data.members} onDone={refresh} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_260px]">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((c) => (
              <Column key={c.id} id={c.id} label={c.label} count={counts[c.id]}>
                {visible
                  .filter((t) => t.status === c.id)
                  .map((t) => (
                    <TaskCard key={t.id} task={t} assignee={t.assignee_id ? memberById.get(t.assignee_id) : undefined} onDone={refresh} />
                  ))}
              </Column>
            ))}
          </div>
        </DndContext>

        <aside className="h-fit rounded-xl border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Team</h2>
          <p className="mb-4 text-xs text-muted-foreground">Avatars pulse red above 5 tasks in progress.</p>
          <ul className="space-y-3">
            {data.members.map((m) => {
              const n = load[m.id] ?? 0;
              const hot = isOverloaded(n);
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground",
                      hot && "animate-burnout",
                    )}
                    style={hot ? undefined : { backgroundColor: m.color }}
                    title={hot ? "Burnout risk" : undefined}
                  >
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                  </div>
                  <span className={cn("flex items-center gap-1 text-xs font-medium", hot ? "text-destructive" : "text-muted-foreground")}>
                    {hot && <Flame className="size-3" />}
                    {n} active
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </main>
    </div>
  );
}

function Column({ id, label, count, children }: { id: Status; label: string; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={cn("min-h-[60vh] rounded-xl p-3 transition-colors", isOver ? "bg-column-active" : "bg-column")}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display font-bold">{label}</h2>
        <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold text-background" aria-label={`${count} tasks`}>
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TaskCard({ task, assignee, onDone }: { task: Task; assignee: Member | undefined; onDone: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const del = useServerFn(deleteTask);
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        "group cursor-grab rounded-lg border bg-card p-4 shadow-sm active:cursor-grabbing",
        isDragging && "relative z-50 rotate-2 shadow-xl",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", PRIO_CLASS[task.priority as Priority])}>
          {task.priority}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={async () => {
            await del({ data: { id: task.id } });
            onDone();
          }}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <h3 className="font-medium leading-snug">{task.title}</h3>
      {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {task.due_date && (
            <>
              <Calendar className="size-3" />
              {new Date(task.due_date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </>
          )}
        </span>
        {assignee && (
          <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: assignee.color }} title={assignee.name}>
            {initials(assignee.name)}
          </span>
        )}
      </div>
    </article>
  );
}

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm";

function NewTaskDialog({ projectId, members, onDone }: { projectId: string; members: Member[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const create = useServerFn(createTask);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> New task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await create({
                data: {
                  project_id: projectId,
                  title: String(f.get("title")),
                  description: String(f.get("description") ?? ""),
                  priority: f.get("priority") as Priority,
                  due_date: (f.get("due") as string) || null,
                  assignee_id: (f.get("assignee") as string) || null,
                },
              });
              setOpen(false);
              onDone();
            } catch {
              toast.error("Couldn't create task");
            }
          }}
        >
          <div className="space-y-1"><Label htmlFor="title">Title</Label><Input id="title" name="title" required maxLength={200} /></div>
          <div className="space-y-1"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" maxLength={2000} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" defaultValue="medium" className={selectCls}>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="due">Due date</Label><Input id="due" name="due" type="date" /></div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="assignee">Assignee</Label>
            <select id="assignee" name="assignee" className={selectCls}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full">Create task</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const add = useServerFn(addMember);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserPlus /> Add user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add user to project</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await add({ data: { project_id: projectId, name: String(f.get("name")), role: f.get("role") as "editor" } });
              setOpen(false);
              onDone();
            } catch {
              toast.error("Couldn't add user");
            }
          }}
        >
          <div className="space-y-1"><Label htmlFor="name">Name</Label><Input id="name" name="name" required maxLength={80} /></div>
          <div className="space-y-1">
            <Label htmlFor="role">Permission</Label>
            <select id="role" name="role" defaultValue="editor" className={selectCls}>
              <option value="owner">Owner</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Add user</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

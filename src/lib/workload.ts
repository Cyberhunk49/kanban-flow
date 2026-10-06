export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export const BURNOUT_THRESHOLD = 5;

/** Count of "In Progress" tasks per assignee. */
export function inProgressByMember(tasks: { status: Status; assignee_id: string | null }[]) {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status === "in_progress" && t.assignee_id) {
      counts[t.assignee_id] = (counts[t.assignee_id] ?? 0) + 1;
    }
  }
  return counts;
}

/** A member is at burnout risk when they have MORE than 5 tasks in progress. */
export function isOverloaded(count: number) {
  return count > BURNOUT_THRESHOLD;
}

export function countByStatus(tasks: { status: Status }[]) {
  const c: Record<Status, number> = { todo: 0, in_progress: 0, done: 0 };
  for (const t of tasks) c[t.status]++;
  return c;
}

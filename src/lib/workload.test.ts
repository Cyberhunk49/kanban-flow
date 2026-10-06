import { describe, it, expect } from "vitest";
import { inProgressByMember, isOverloaded, countByStatus } from "./workload";

describe("workload balancing", () => {
  it("5 in-progress tasks is not overloaded", () => {
    expect(isOverloaded(5)).toBe(false);
  });
  it("6 in-progress tasks is overloaded", () => {
    expect(isOverloaded(6)).toBe(true);
  });
  it("only counts in_progress tasks per member", () => {
    const counts = inProgressByMember([
      { status: "in_progress", assignee_id: "a" },
      { status: "todo", assignee_id: "a" },
      { status: "in_progress", assignee_id: "a" },
      { status: "done", assignee_id: "b" },
    ]);
    expect(counts).toEqual({ a: 2 });
  });
  it("counts tasks per column", () => {
    expect(countByStatus([{ status: "todo" }, { status: "done" }, { status: "done" }])).toEqual({
      todo: 1,
      in_progress: 0,
      done: 2,
    });
  });
});

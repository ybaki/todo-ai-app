import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/types/database";
import { sortTasksForList } from "@/lib/quadrant";

function makeTask(partial: Partial<TaskRow> & Pick<TaskRow, "id" | "quadrant" | "status">): TaskRow {
  return {
    id: partial.id,
    user_id: "u1",
    raw_text: partial.raw_text ?? "test",
    title: partial.title ?? null,
    status: partial.status,
    quadrant: partial.quadrant,
    estimated_minutes: null,
    deadline: partial.deadline ?? null,
    splittable: false,
    minimum_chunk_minutes: null,
    energy: null,
    tags: [],
    confidence: null,
    source: "web",
    idempotency_key: null,
    created_at: partial.created_at ?? "2026-07-31T10:00:00Z",
    updated_at: partial.updated_at ?? "2026-07-31T10:00:00Z",
  };
}

describe("sortTasksForList", () => {
  it("orders by priority then deadline then done at bottom", () => {
    const sorted = sortTasksForList([
      makeTask({
        id: "1",
        quadrant: "urgent_important",
        status: "inbox",
        deadline: "2026-08-07T18:00:00Z",
      }),
      makeTask({
        id: "2",
        quadrant: "urgent_important",
        status: "inbox",
        deadline: "2026-08-02T17:00:00Z",
      }),
      makeTask({ id: "3", quadrant: "not_urgent_important", status: "inbox" }),
      makeTask({ id: "4", quadrant: "urgent_important", status: "done" }),
    ]);

    expect(sorted.map((t) => t.id)).toEqual(["2", "1", "3", "4"]);
  });
});

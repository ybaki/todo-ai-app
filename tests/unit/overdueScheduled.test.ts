import { describe, expect, it } from "vitest";
import {
  computeEndOfDayRolloverItems,
  computeOverdueScheduledItems,
  filterTasksForMainList,
  isOverdueCardOnBoard,
  OVERDUE_CARD_GRACE_MINUTES,
} from "@/lib/tasks/overdueScheduled";
import type { TaskRow } from "@/types/database";

function makeTask(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    id: overrides.id,
    user_id: "u1",
    raw_text: overrides.raw_text ?? "test",
    title: overrides.title ?? null,
    status: overrides.status ?? "scheduled",
    quadrant: overrides.quadrant ?? "urgent_important",
    deadline: null,
    estimated_minutes: 60,
    splittable: false,
    minimum_chunk_minutes: null,
    energy: null,
    tags: [],
    confidence: null,
    source: "web",
    idempotency_key: null,
    created_at: "2026-08-02T10:00:00Z",
    updated_at: "2026-08-02T10:00:00Z",
  };
}

describe("overdueScheduled", () => {
  const blockEnd = "2026-08-02T14:00:00+03:00";

  it("plan bitisinden hemen sonra kart gorunur", () => {
    expect(isOverdueCardOnBoard(blockEnd, new Date("2026-08-02T13:59:59+03:00"))).toBe(false);
    expect(isOverdueCardOnBoard(blockEnd, new Date("2026-08-02T14:00:00+03:00"))).toBe(true);
    expect(OVERDUE_CARD_GRACE_MINUTES).toBe(0);
  });

  it("blok gunu 23:59'a kadar panoda kalir", () => {
    expect(isOverdueCardOnBoard(blockEnd, new Date("2026-08-02T23:59:00+03:00"))).toBe(true);
    expect(isOverdueCardOnBoard(blockEnd, new Date("2026-08-03T00:00:01+03:00"))).toBe(false);
  });

  it("bitis aninda listeye alir", () => {
    const tasks = new Map([["t1", makeTask({ id: "t1", title: "Toplanti" })]]);
    const items = computeOverdueScheduledItems(
      [
        {
          id: "b1",
          task_id: "t1",
          start_at: "2026-08-02T13:00:00+03:00",
          end_at: blockEnd,
        },
      ],
      tasks,
      new Date("2026-08-02T14:00:00+03:00")
    );

    expect(items).toHaveLength(1);
  });

  it("henuz bitmemis bloklari dahil etmez", () => {
    const tasks = new Map([["t1", makeTask({ id: "t1" })]]);
    const items = computeOverdueScheduledItems(
      [
        {
          id: "b1",
          task_id: "t1",
          start_at: "2026-08-02T14:00:00+03:00",
          end_at: "2026-08-02T15:00:00+03:00",
        },
      ],
      tasks,
      new Date("2026-08-02T14:10:00+03:00")
    );

    expect(items).toHaveLength(0);
  });

  it("tamamlanan gorevleri dahil etmez", () => {
    const tasks = new Map([["t1", makeTask({ id: "t1", status: "done" })]]);
    const items = computeOverdueScheduledItems(
      [
        {
          id: "b1",
          task_id: "t1",
          start_at: "2026-08-02T10:00:00+03:00",
          end_at: "2026-08-02T11:00:00+03:00",
        },
      ],
      tasks,
      new Date("2026-08-02T14:10:00+03:00")
    );

    expect(items).toHaveLength(0);
  });

  it("hizli nottaki gorevleri ana listeden cikarir", () => {
    const tasks = [
      makeTask({ id: "t1", title: "Geciken" }),
      makeTask({ id: "t2", title: "Normal" }),
    ];
    const overdueItems = [
      {
        taskId: "t1",
        blockId: "b1",
        title: "Geciken",
        quadrant: "urgent_important" as const,
        startAt: "2026-08-02T13:00:00+03:00",
        endAt: blockEnd,
      },
    ];

    const filtered = filterTasksForMainList(tasks, overdueItems);
    expect(filtered.map((task) => task.id)).toEqual(["t2"]);
  });

  it("rollover adaylarini oncelige gore siralar", () => {
    const tasks = new Map([
      ["t1", makeTask({ id: "t1", quadrant: "not_urgent_important" })],
      ["t2", makeTask({ id: "t2", quadrant: "urgent_important" })],
    ]);
    const items = computeEndOfDayRolloverItems(
      [
        {
          id: "b1",
          task_id: "t1",
          start_at: "2026-08-02T13:00:00+03:00",
          end_at: "2026-08-02T14:00:00+03:00",
        },
        {
          id: "b2",
          task_id: "t2",
          start_at: "2026-08-02T13:00:00+03:00",
          end_at: "2026-08-02T14:00:00+03:00",
        },
      ],
      tasks,
      new Date("2026-08-02T23:59:00+03:00")
    );

    expect(items.map((item) => item.taskId)).toEqual(["t2", "t1"]);
  });
});

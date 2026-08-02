import { describe, expect, it } from "vitest";
import { isDeadlinePast } from "@/lib/deadline";
import type { TaskRow } from "@/types/database";

function isOverdueCandidate(task: Pick<TaskRow, "deadline" | "status">, now: Date): boolean {
  return Boolean(
    task.deadline &&
      task.status !== "done" &&
      task.status !== "archived" &&
      isDeadlinePast(task.deadline, now)
  );
}

describe("overdue notification eligibility", () => {
  const now = new Date("2026-08-01T20:00:00+03:00");

  it("deadline gecmis aktif gorevleri bildirir", () => {
    expect(
      isOverdueCandidate(
        { deadline: "2026-08-01T18:00:00+03:00", status: "scheduled" },
        now
      )
    ).toBe(true);
  });

  it("tamamlanan gorevleri bildirmez", () => {
    expect(
      isOverdueCandidate(
        { deadline: "2026-08-01T18:00:00+03:00", status: "done" },
        now
      )
    ).toBe(false);
  });
});

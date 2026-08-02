import { describe, expect, it } from "vitest";
import { addMinutes } from "date-fns";
import {
  canAssignTaskAt,
  getNextObstacleStart,
  pickTaskForCurrentSlot,
} from "@/lib/scheduler/assignCurrentSlot";
import type { ExistingCommitment, WorkingHoursPreferences } from "@/lib/scheduler/types";
import type { TaskRow } from "@/types/database";

const TEST_PREFERENCES: WorkingHoursPreferences = {
  timezone: "Europe/Istanbul",
  workStart: "09:00",
  workEnd: "18:00",
  workDays: [1, 2, 3, 4, 5, 6, 7],
  activeStart: "09:00",
  activeEnd: "24:00",
  activeDays: [1, 2, 3, 4, 5, 6, 7],
  urgentScheduleMode: "work_hours",
  planScheduleMode: "work_hours",
  getRidScheduleMode: "work_hours",
  lunchStart: null,
  lunchEnd: null,
  bufferMinutes: 0,
  minFocusBlockMinutes: 30,
  maxDailyFocusMinutes: 240,
};

function makeTask(
  overrides: Partial<TaskRow> & Pick<TaskRow, "id" | "quadrant" | "estimated_minutes">
): TaskRow {
  return {
    id: overrides.id,
    user_id: "user-1",
    raw_text: overrides.raw_text ?? "test",
    title: overrides.title ?? null,
    quadrant: overrides.quadrant,
    estimated_minutes: overrides.estimated_minutes,
    deadline: overrides.deadline ?? null,
    status: overrides.status ?? "suggested",
    splittable: false,
    minimum_chunk_minutes: null,
    energy: null,
    tags: [],
    confidence: null,
    created_at: "2026-08-02T10:00:00.000Z",
    updated_at: "2026-08-02T10:00:00.000Z",
  } as TaskRow;
}

describe("assignCurrentSlot helpers", () => {
  const now = new Date("2026-08-02T10:12:00.000Z"); // 13:12 Istanbul (+3)
  const dayEnd = new Date("2026-08-02T20:59:59.999Z");
  const meetingStart = new Date("2026-08-02T11:00:00.000Z"); // 14:00 Istanbul

  const commitments: ExistingCommitment[] = [
    { start: meetingStart, end: addMinutes(meetingStart, 60), kind: "busy" },
  ];

  const slotParams = {
    preferences: TEST_PREFERENCES,
    scheduledTasks: [] as Array<{
      start: Date;
      end: Date;
      quadrant: import("@/types/database").EisenhowerQuadrant | null;
    }>,
  };

  it("sonraki engeli (toplanti) bulur", () => {
    expect(getNextObstacleStart(now, commitments, dayEnd)).toEqual(meetingStart);
  });

  it("13:12 senaryosunda 1 saatlik deadline ve aksiyon al sigmaz, kurtul isi secilir", () => {
    const obstacleStart = getNextObstacleStart(now, commitments, dayEnd);
    const tasks = [
      makeTask({
        id: "deadline-task",
        quadrant: "urgent_important",
        estimated_minutes: 60,
        deadline: "2026-08-02T11:12:00.000Z", // 14:12 Istanbul
        raw_text: "deadline isi",
      }),
      makeTask({
        id: "action-task",
        quadrant: "urgent_important",
        estimated_minutes: 60,
        raw_text: "aksiyon al isi",
      }),
      makeTask({
        id: "kurtul-task",
        quadrant: "get_rid",
        estimated_minutes: 30,
        raw_text: "markete git",
      }),
    ];

    expect(
      canAssignTaskAt({
        task: tasks[0],
        startAt: now,
        obstacleStart,
        commitments,
        now,
        ...slotParams,
      })
    ).toBe(false);

    expect(
      canAssignTaskAt({
        task: tasks[1],
        startAt: now,
        obstacleStart,
        commitments,
        now,
        ...slotParams,
      })
    ).toBe(false);

    expect(
      canAssignTaskAt({
        task: tasks[2],
        startAt: now,
        obstacleStart,
        commitments,
        now,
        ...slotParams,
      })
    ).toBe(true);

    const picked = pickTaskForCurrentSlot(tasks, {
      startAt: now,
      obstacleStart,
      commitments,
      activeTaskIds: new Set(),
      now,
      preferences: TEST_PREFERENCES,
      scheduledEntries: [],
    });

    expect(picked?.id).toBe("kurtul-task");
  });

  it("deadline'i gecen isler engel oncesine sigmiyorsa atlanir", () => {
    const obstacleStart = addMinutes(now, 48);
    const task = makeTask({
      id: "tight-deadline",
      quadrant: "urgent_important",
      estimated_minutes: 60,
      deadline: "2026-08-02T11:00:00.000Z",
      raw_text: "siki deadline",
    });

    expect(
      canAssignTaskAt({
        task,
        startAt: now,
        obstacleStart,
        commitments: [],
        now,
        ...slotParams,
      })
    ).toBe(false);
  });

  it("calisma saati disina atama yapmaz", () => {
    const afterWorkHours = new Date("2026-08-02T15:30:00.000Z"); // 18:30 Istanbul
    const task = makeTask({
      id: "late-task",
      quadrant: "urgent_important",
      estimated_minutes: 60,
      raw_text: "gec saat isi",
    });

    expect(
      canAssignTaskAt({
        task,
        startAt: afterWorkHours,
        obstacleStart: addMinutes(afterWorkHours, 120),
        commitments: [],
        now: afterWorkHours,
        ...slotParams,
      })
    ).toBe(false);
  });
});

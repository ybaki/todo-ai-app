"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import {
  computeOverdueScheduledItems,
  type OverdueScheduledItem,
  type ScheduledBlockWithTask,
} from "@/lib/tasks/overdueScheduled";
import type { TaskRow } from "@/types/database";

const EOD_STORAGE_KEY = "todo-eod-rollover-date";
const POLL_MS = 15_000;

export function useOverdueScheduledTasks(
  tasks: TaskRow[],
  refreshKey = 0,
  onRolloverComplete?: () => void
) {
  const [items, setItems] = useState<OverdueScheduledItem[]>([]);

  const load = useCallback(async () => {
    const now = new Date();
    const start = addDays(startOfDay(now), -14).toISOString();
    const end = now.toISOString();
    const query = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

    const response = await fetch(`/api/schedule/blocks?${query}`);
    if (!response.ok) {
      setItems([]);
      return;
    }

    const data = (await response.json()) as { blocks: ScheduledBlockWithTask[] };
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    setItems(computeOverdueScheduledItems(data.blocks ?? [], tasksById, now));
  }, [tasks]);

  const tryEndOfDayRollover = useCallback(async () => {
    const now = new Date();
    const todayKey = format(now, "yyyy-MM-dd");
    const lastRun = localStorage.getItem(EOD_STORAGE_KEY);
    const minutes = now.getHours() * 60 + now.getMinutes();

    const shouldRunEod = minutes >= 23 * 60 + 59 && lastRun !== todayKey;
    const shouldRunCatchUp =
      !!lastRun &&
      lastRun < todayKey &&
      now.getHours() >= 9 &&
      minutes < 23 * 60 + 59;

    if (!shouldRunEod && !shouldRunCatchUp) return;

    const response = await fetch("/api/schedule/end-of-day-rollover", { method: "POST" });
    if (!response.ok) return;

    const data = (await response.json()) as { skipped?: boolean; rolledOver?: number };
    if (data.skipped) return;

    localStorage.setItem(EOD_STORAGE_KEY, todayKey);
    onRolloverComplete?.();
    await load();
  }, [load, onRolloverComplete]);

  useEffect(() => {
    void load();
    void tryEndOfDayRollover();
    const timer = window.setInterval(() => {
      void load();
      void tryEndOfDayRollover();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, tryEndOfDayRollover, refreshKey]);

  return items;
}

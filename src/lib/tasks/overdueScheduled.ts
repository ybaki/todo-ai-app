import { addMinutes, endOfDay, startOfDay } from "date-fns";
import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { QUADRANT_PRIORITY, normalizeQuadrant } from "@/lib/quadrant";

/** Plan bitisinden sonra kart hemen gorunur (bekleme yok). */
export const OVERDUE_CARD_GRACE_MINUTES = 0;

export interface ScheduledBlockWithTask {
  id: string;
  task_id: string;
  start_at: string;
  end_at: string;
  tasks?: {
    title: string | null;
    raw_text: string;
    quadrant: EisenhowerQuadrant | null;
  } | null;
}

export interface OverdueScheduledItem {
  taskId: string;
  blockId: string;
  title: string;
  quadrant: EisenhowerQuadrant | null;
  startAt: string;
  endAt: string;
}

function getBlockTitle(block: ScheduledBlockWithTask): string {
  return block.tasks?.title?.trim() || block.tasks?.raw_text?.trim() || "Görev";
}

function isActiveTask(task: TaskRow | undefined): boolean {
  if (!task) return true;
  return task.status !== "done" && task.status !== "archived";
}

export function getOverdueCardVisibleFrom(endAt: Date): Date {
  return addMinutes(endAt, OVERDUE_CARD_GRACE_MINUTES);
}

export function getOverdueCardBoardUntil(endAt: Date): Date {
  return endOfDay(endAt);
}

/** Kart, plan bitisinden hemen sonra ve blok gunu 23:59'a kadar gorunur. */
export function isOverdueCardOnBoard(blockEndAt: string | Date, now: Date = new Date()): boolean {
  const end = new Date(blockEndAt);
  const visibleFrom = getOverdueCardVisibleFrom(end);
  const boardUntil = getOverdueCardBoardUntil(end);
  const nowMs = now.getTime();
  return nowMs >= visibleFrom.getTime() && nowMs <= boardUntil.getTime();
}

function upsertBestItem(
  bestByTask: Map<string, OverdueScheduledItem>,
  block: ScheduledBlockWithTask,
  task: TaskRow | undefined
) {
  const endMs = new Date(block.end_at).getTime();
  const existing = bestByTask.get(block.task_id);
  if (existing && new Date(existing.endAt).getTime() >= endMs) return;

  bestByTask.set(block.task_id, {
    taskId: block.task_id,
    blockId: block.id,
    title: getBlockTitle(block),
      quadrant: normalizeQuadrant(task?.quadrant ?? block.tasks?.quadrant ?? null),
    startAt: block.start_at,
    endAt: block.end_at,
  });
}

/** Hizli notlar panosunda gosterilecek gecikmis planli gorevler. */
export function computeOverdueScheduledItems(
  blocks: ScheduledBlockWithTask[],
  tasksById: Map<string, TaskRow>,
  now: Date = new Date()
): OverdueScheduledItem[] {
  const bestByTask = new Map<string, OverdueScheduledItem>();

  for (const block of blocks) {
    if (!isOverdueCardOnBoard(block.end_at, now)) continue;

    const task = tasksById.get(block.task_id);
    if (!isActiveTask(task)) continue;

    upsertBestItem(bestByTask, block, task);
  }

  return sortOverdueItems(Array.from(bestByTask.values()));
}

/** Gecmis gunlerden kalan veya bugun panoda kalan; gece 23:59 rollover adaylari. */
export function computeEndOfDayRolloverItems(
  blocks: ScheduledBlockWithTask[],
  tasksById: Map<string, TaskRow>,
  now: Date = new Date()
): OverdueScheduledItem[] {
  const todayStart = startOfDay(now);
  const bestByTask = new Map<string, OverdueScheduledItem>();

  for (const block of blocks) {
    const task = tasksById.get(block.task_id);
    if (!isActiveTask(task)) continue;

    const end = new Date(block.end_at);
    const isStaleBlock = end < todayStart;
    const isTodayBoardItem = isOverdueCardOnBoard(end, now);

    if (!isStaleBlock && !isTodayBoardItem) continue;

    upsertBestItem(bestByTask, block, task);
  }

  return sortOverdueItems(Array.from(bestByTask.values()));
}

function sortOverdueItems(items: OverdueScheduledItem[]): OverdueScheduledItem[] {
  return items.sort((a, b) => {
    const priorityA = a.quadrant ? QUADRANT_PRIORITY[a.quadrant] : 99;
    const priorityB = b.quadrant ? QUADRANT_PRIORITY[b.quadrant] : 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(b.endAt).getTime() - new Date(a.endAt).getTime();
  });
}

export function getQuadrantRank(quadrant: EisenhowerQuadrant | null): number {
  if (!quadrant) return 99;
  return QUADRANT_PRIORITY[quadrant];
}

/** Hizli notlarda gorunen gorevler ana listeden cikarilir; yeniden planlaninca geri gelir. */
export function filterTasksForMainList(
  tasks: TaskRow[],
  overdueItems: OverdueScheduledItem[]
): TaskRow[] {
  if (overdueItems.length === 0) return tasks;
  const hiddenIds = new Set(overdueItems.map((item) => item.taskId));
  return tasks.filter((task) => !hiddenIds.has(task.id));
}

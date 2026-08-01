import type { EisenhowerQuadrant, TaskRow } from "@/types/database";

/** Kullaniciya gosterilen oncelik etiketleri (parantezsiz). */
export const QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "Aksiyon",
  not_urgent_important: "Planla",
  urgent_not_important: "Devret",
  not_urgent_not_important: "Zaman Tuzağı",
};

export const QUADRANT_ORDER: EisenhowerQuadrant[] = [
  "urgent_important",
  "not_urgent_important",
  "urgent_not_important",
  "not_urgent_not_important",
];

/** Listede yukari -> asagi oncelik sirasi (1 en yuksek). */
export const QUADRANT_PRIORITY: Record<EisenhowerQuadrant, number> = {
  urgent_important: 1,
  not_urgent_important: 2,
  urgent_not_important: 3,
  not_urgent_not_important: 4,
};

export const DEFAULT_QUADRANT: EisenhowerQuadrant = "not_urgent_not_important";

export const QUADRANT_ROW_STYLES: Record<EisenhowerQuadrant, string> = {
  urgent_important: "border-l-4 border-l-red-500 bg-red-500/15",
  not_urgent_important: "border-l-4 border-l-emerald-500 bg-emerald-500/15",
  urgent_not_important: "border-l-4 border-l-amber-500 bg-amber-500/15",
  not_urgent_not_important: "border-l-4 border-l-slate-500 bg-slate-600/20",
};

export function resolveQuadrant(task: TaskRow): EisenhowerQuadrant {
  return task.quadrant ?? DEFAULT_QUADRANT;
}

export function getListPriority(task: TaskRow): number {
  if (!task.quadrant) return 99;
  return QUADRANT_PRIORITY[task.quadrant];
}

export function sortTasksForList(tasks: TaskRow[]): TaskRow[] {
  const active = tasks.filter((task) => task.status !== "done" && task.status !== "archived");
  const done = tasks.filter((task) => task.status === "done");

  active.sort((a, b) => {
    const priorityDiff = getListPriority(a) - getListPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  done.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return [...active, ...done];
}

export function taskMatchesSearch(task: TaskRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = `${task.title ?? ""} ${task.raw_text}`.toLowerCase();
  return haystack.includes(normalized);
}

// Geriye donuk: matris / eski bilesenler icin
export const QUADRANT_ACCENT = QUADRANT_ROW_STYLES;

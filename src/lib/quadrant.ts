import type { EisenhowerQuadrant, LegacyQuadrant, StoredQuadrant, TaskRow } from "@/types/database";

/** Kullaniciya gosterilen oncelik etiketleri. */
export const QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "Aksiyon Al",
  not_urgent_important: "Planla",
  get_rid: "Kurtul",
};

/** Dropdown / secim ekraninda kisa aciklama. */
export const QUADRANT_HINTS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "Bugün ne bitmeli?",
  not_urgent_important: "Geleceğim için bugün takvime ne koymalıyım?",
  get_rid:
    "Odaklanmamı engelleyen şu ufak tefek işleri ne zaman hızlıca aradan çıkarıp bitirebilirim?",
};

export const QUADRANT_ORDER: EisenhowerQuadrant[] = [
  "urgent_important",
  "not_urgent_important",
  "get_rid",
];

/** Listede yukari -> asagi oncelik sirasi (1 en yuksek). */
export const QUADRANT_PRIORITY: Record<EisenhowerQuadrant, number> = {
  urgent_important: 1,
  not_urgent_important: 2,
  get_rid: 3,
};

export const DEFAULT_QUADRANT: EisenhowerQuadrant = "get_rid";

export const QUADRANT_ROW_STYLES: Record<EisenhowerQuadrant, string> = {
  urgent_important: "border-l-4 border-l-red-500 bg-red-500/15",
  not_urgent_important: "border-l-4 border-l-emerald-500 bg-emerald-500/15",
  get_rid: "border-l-4 border-l-violet-500 bg-violet-500/15",
};

export const QUADRANT_CARD_STYLES: Record<EisenhowerQuadrant, string> = {
  urgent_important: "border-red-500/50 bg-red-500/15",
  not_urgent_important: "border-emerald-500/50 bg-emerald-500/15",
  get_rid: "border-violet-500/50 bg-violet-500/15",
};

export const QUADRANT_BLOCK_STYLES: Record<EisenhowerQuadrant, string> = {
  urgent_important: "border-red-500/60 bg-red-500/25 text-red-100",
  not_urgent_important: "border-emerald-500/60 bg-emerald-500/25 text-emerald-100",
  get_rid: "border-violet-500/60 bg-violet-500/25 text-violet-100",
};

const LEGACY_TO_QUADRANT: Record<LegacyQuadrant, EisenhowerQuadrant> = {
  urgent_not_important: "get_rid",
  not_urgent_not_important: "get_rid",
};

/** DB veya LLM'den gelen eski degerleri yeni 3 oncelige cevirir. */
export function normalizeQuadrant(
  value: StoredQuadrant | null | undefined
): EisenhowerQuadrant | null {
  if (!value) return null;
  if (value in LEGACY_TO_QUADRANT) {
    return LEGACY_TO_QUADRANT[value as LegacyQuadrant];
  }
  return value;
}

export function resolveQuadrant(task: TaskRow): EisenhowerQuadrant {
  return normalizeQuadrant(task.quadrant) ?? DEFAULT_QUADRANT;
}

export function getListPriority(task: TaskRow): number {
  const quadrant = normalizeQuadrant(task.quadrant);
  if (!quadrant) return 99;
  return QUADRANT_PRIORITY[quadrant];
}

function getDeadlineSortKey(deadline: string | null): number {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const time = new Date(deadline).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function sortTasksForList(tasks: TaskRow[]): TaskRow[] {
  const active = tasks.filter((task) => task.status !== "done" && task.status !== "archived");
  const done = tasks.filter((task) => task.status === "done");

  active.sort((a, b) => {
    const priorityDiff = getListPriority(a) - getListPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    const deadlineDiff = getDeadlineSortKey(a.deadline) - getDeadlineSortKey(b.deadline);
    if (deadlineDiff !== 0) return deadlineDiff;
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

/** Kullanicinin sectigi is suresi presetleri (dakika bazli). */
export type TaskDurationPreset = "30m" | "1h" | "2h" | "5h" | "10h" | "full_week";

export const TASK_DURATION_ORDER: TaskDurationPreset[] = [
  "30m",
  "1h",
  "2h",
  "5h",
  "10h",
  "full_week",
];

/** Hafta ici 09-24, ogle haric ~14 saat x 5 gun. */
export const FULL_WEEK_MINUTES = 5 * 14 * 60;

export const TASK_DURATION_CONFIG: Record<
  TaskDurationPreset,
  { label: string; minutes: number; splittable: boolean; minimumChunkMinutes: number }
> = {
  "30m": { label: "30 dk", minutes: 30, splittable: false, minimumChunkMinutes: 30 },
  "1h": { label: "1 saat", minutes: 60, splittable: false, minimumChunkMinutes: 60 },
  "2h": { label: "2 saat", minutes: 120, splittable: false, minimumChunkMinutes: 120 },
  "5h": { label: "5 saat", minutes: 300, splittable: true, minimumChunkMinutes: 60 },
  "10h": { label: "10 saat", minutes: 600, splittable: true, minimumChunkMinutes: 60 },
  full_week: {
    label: "Tüm haftayı bu iş ile kapat",
    minutes: FULL_WEEK_MINUTES,
    splittable: true,
    minimumChunkMinutes: 60,
  },
};

export const DEFAULT_TASK_DURATION: TaskDurationPreset = "1h";
export const DEFAULT_ESTIMATED_MINUTES = TASK_DURATION_CONFIG[DEFAULT_TASK_DURATION].minutes;

/** Geriye donuk tip adi. */
export type TaskSize = TaskDurationPreset;

export function durationPresetToMinutes(preset: TaskDurationPreset): number {
  return TASK_DURATION_CONFIG[preset].minutes;
}

export function durationSchedulingDefaults(preset: TaskDurationPreset): {
  splittable: boolean;
  minimumChunkMinutes: number;
} {
  const config = TASK_DURATION_CONFIG[preset];
  return { splittable: config.splittable, minimumChunkMinutes: config.minimumChunkMinutes };
}

export function minutesToDurationPreset(minutes: number): TaskDurationPreset {
  let best: TaskDurationPreset = DEFAULT_TASK_DURATION;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const preset of TASK_DURATION_ORDER) {
    const diff = Math.abs(TASK_DURATION_CONFIG[preset].minutes - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset;
    }
  }

  return best;
}

export function normalizeEstimatedMinutes(minutes: number): number {
  return TASK_DURATION_CONFIG[minutesToDurationPreset(minutes)].minutes;
}

/** Geriye donuk aliaslar. */
export const TASK_SIZE_ORDER = TASK_DURATION_ORDER;
export const TASK_SIZE_MINUTES = Object.fromEntries(
  TASK_DURATION_ORDER.map((preset) => [preset, TASK_DURATION_CONFIG[preset].minutes])
) as Record<TaskDurationPreset, number>;
export function taskSizeSchedulingDefaults(preset: TaskDurationPreset) {
  return durationSchedulingDefaults(preset);
}
export function minutesToTaskSize(minutes: number) {
  return minutesToDurationPreset(minutes);
}

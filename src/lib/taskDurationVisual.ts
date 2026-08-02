import type { EisenhowerQuadrant } from "@/types/database";
import {
  DEFAULT_ESTIMATED_MINUTES,
  TASK_DURATION_ORDER,
  minutesToDurationPreset,
  type TaskDurationPreset,
} from "@/lib/taskSize";
import { resolveTaskDurationMinutes } from "@/lib/tasks/estimateDuration";

/** Dikey bantta gosterilecek kisa sure metni (asagidan yukari). */
export function getDurationVerticalLabel(preset: TaskDurationPreset): string {
  switch (preset) {
    case "30m":
      return "30 dk";
    case "1h":
      return "1 s";
    case "2h":
      return "2 s";
    case "5h":
      return "5 s";
    case "10h":
      return "10 s";
    case "full_week":
      return "Hft";
  }
}

export function getDurationPresetFromMinutes(
  minutes: number | null | undefined
): TaskDurationPreset {
  return minutesToDurationPreset(minutes ?? DEFAULT_ESTIMATED_MINUTES);
}

export function getDurationToneIndex(minutes: number | null | undefined): number {
  const preset = getDurationPresetFromMinutes(minutes);
  return TASK_DURATION_ORDER.indexOf(preset);
}

export function getTaskDurationVerticalLabel(
  rawText: string,
  storedMinutes: number | null | undefined
): string {
  const minutes = resolveTaskDurationMinutes(rawText, storedMinutes);
  return getDurationVerticalLabel(getDurationPresetFromMinutes(minutes));
}

/** Aksiyon Al (kirmizi) — 30 dk acik, 10 saat cok koyu. */
const URGENT_TONE_STYLES = [
  "border-l-4 border-l-red-300 bg-red-400/10",
  "border-l-4 border-l-red-400 bg-red-500/14",
  "border-l-4 border-l-red-500 bg-red-600/20",
  "border-l-4 border-l-red-600 bg-red-700/28",
  "border-l-4 border-l-red-700 bg-red-800/38",
  "border-l-4 border-l-red-900 bg-red-950/52",
] as const;

/** Planla (yesil) — 6 ton. */
const PLAN_TONE_STYLES = [
  "border-l-4 border-l-emerald-300 bg-emerald-400/10",
  "border-l-4 border-l-emerald-400 bg-emerald-500/14",
  "border-l-4 border-l-emerald-500 bg-emerald-600/20",
  "border-l-4 border-l-emerald-600 bg-emerald-700/28",
  "border-l-4 border-l-emerald-700 bg-emerald-800/38",
  "border-l-4 border-l-emerald-900 bg-emerald-950/52",
] as const;

/** Kurtul (mor) — 6 ton. */
const GET_RID_TONE_STYLES = [
  "border-l-4 border-l-violet-300 bg-violet-400/10",
  "border-l-4 border-l-violet-400 bg-violet-500/14",
  "border-l-4 border-l-violet-500 bg-violet-600/20",
  "border-l-4 border-l-violet-600 bg-violet-700/28",
  "border-l-4 border-l-violet-700 bg-violet-800/38",
  "border-l-4 border-l-violet-900 bg-violet-950/52",
] as const;

const QUADRANT_TONE_STYLES: Record<EisenhowerQuadrant, readonly string[]> = {
  urgent_important: URGENT_TONE_STYLES,
  not_urgent_important: PLAN_TONE_STYLES,
  get_rid: GET_RID_TONE_STYLES,
};

export function getTaskRowCardStyle(params: {
  quadrant: EisenhowerQuadrant | null;
  rawText: string;
  estimatedMinutes: number | null | undefined;
  isDone: boolean;
}): string {
  if (params.isDone) {
    return "border border-slate-800 bg-slate-900/30 opacity-60";
  }

  if (!params.quadrant) {
    return "border border-dashed border-slate-600 bg-slate-900/40";
  }

  const minutes = resolveTaskDurationMinutes(params.rawText, params.estimatedMinutes);
  const toneIndex = getDurationToneIndex(minutes);
  const tones = QUADRANT_TONE_STYLES[params.quadrant];
  return tones[toneIndex] ?? tones[0];
}

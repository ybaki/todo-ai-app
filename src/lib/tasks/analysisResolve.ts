import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { getEffectiveQuadrant } from "@/lib/scheduler/deadlineUrgency";
import type { TaskAnalysisResult } from "@/lib/llm/schema";
import {
  durationSchedulingDefaults,
  minutesToDurationPreset,
  type TaskDurationPreset,
} from "@/lib/taskSize";
import { resolveTaskDurationMinutes } from "@/lib/tasks/estimateDuration";

export function resolveEstimatedMinutes(task: TaskRow, analysis?: TaskAnalysisResult): number {
  return resolveTaskDurationMinutes(
    task.raw_text,
    task.estimated_minutes,
    analysis?.estimatedMinutes
  );
}

export function resolveTaskDuration(
  task: TaskRow,
  analysis?: TaskAnalysisResult
): TaskDurationPreset {
  if (task.estimated_minutes) {
    return minutesToDurationPreset(task.estimated_minutes);
  }

  const minutes = resolveTaskDurationMinutes(
    task.raw_text,
    task.estimated_minutes,
    analysis?.estimatedMinutes
  );
  return minutesToDurationPreset(minutes);
}

/** Geriye donuk alias. */
export const resolveTaskSize = resolveTaskDuration;

export function resolveSplittable(
  estimatedMinutes: number,
  durationPreset: TaskDurationPreset,
  analysis?: TaskAnalysisResult
): { splittable: boolean; minimumChunkMinutes: number | null } {
  const defaults = durationSchedulingDefaults(durationPreset);
  if (defaults.splittable) {
    return { splittable: true, minimumChunkMinutes: defaults.minimumChunkMinutes };
  }

  if (analysis) {
    return {
      splittable: analysis.splittable,
      minimumChunkMinutes: analysis.minimumChunkMinutes,
    };
  }

  return { splittable: estimatedMinutes > 120, minimumChunkMinutes: Math.min(60, estimatedMinutes) };
}

export function resolveQuadrantAfterAnalysis(
  task: TaskRow,
  analysisQuadrant: EisenhowerQuadrant,
  now: Date
): EisenhowerQuadrant {
  const manualQuadrant = task.quadrant;
  const deadline = task.deadline ? new Date(task.deadline) : null;

  if (manualQuadrant) {
    return getEffectiveQuadrant(manualQuadrant, deadline, now) ?? manualQuadrant;
  }

  return getEffectiveQuadrant(analysisQuadrant, deadline, now) ?? analysisQuadrant;
}

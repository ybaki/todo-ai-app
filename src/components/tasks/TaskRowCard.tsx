"use client";

import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { formatTaskDeadline, isDeadlinePast } from "@/lib/deadline";
import {
  QUADRANT_LABELS,
  normalizeQuadrant,
} from "@/lib/quadrant";
import {
  getTaskDurationVerticalLabel,
  getTaskRowCardStyle,
} from "@/lib/taskDurationVisual";
import { TaskCheckbox } from "./TaskCheckbox";
import { TaskDurationRail } from "./TaskDurationRail";
import { TaskEditMenu, type TimeSuggestMode } from "./TaskEditMenu";

interface TaskRowCardProps {
  task: TaskRow;
  onDelete: (taskId: string) => void;
  onQuadrantChange: (taskId: string, quadrant: EisenhowerQuadrant) => void;
  onReschedule: (taskId: string, mode: TimeSuggestMode, customStartAt?: string) => void | Promise<void>;
  onToggleDone: (taskId: string, done: boolean) => void;
}

function getDisplayText(task: TaskRow): string {
  return task.title?.trim() || task.raw_text.trim();
}

function getStatusLabel(task: TaskRow): string | null {
  const quadrant = normalizeQuadrant(task.quadrant);
  if (quadrant) return QUADRANT_LABELS[quadrant];
  if (task.status === "analyzing") return "AI analiz ediyor...";
  if (task.status === "needs_user_input") return "AI belirleyemedi, sen sec";
  return "Oncelik belirlenmedi";
}

export function TaskRowCard({
  task,
  onDelete,
  onQuadrantChange,
  onReschedule,
  onToggleDone,
}: TaskRowCardProps) {
  const isDone = task.status === "done";
  const quadrant = normalizeQuadrant(task.quadrant);
  const statusLabel = getStatusLabel(task);
  const deadlinePast = task.deadline && !isDone ? isDeadlinePast(task.deadline) : false;
  const durationLabel = getTaskDurationVerticalLabel(task.raw_text, task.estimated_minutes);
  const rowStyle = getTaskRowCardStyle({
    quadrant,
    rawText: task.raw_text,
    estimatedMinutes: task.estimated_minutes,
    isDone,
  });

  return (
    <article
      className={`relative flex items-stretch overflow-hidden rounded-lg transition-colors duration-200 ${rowStyle}`}
    >
      <TaskDurationRail label={durationLabel} muted={isDone} />

      <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-3">
        <TaskCheckbox
          checked={isDone}
          onChange={(checked) => onToggleDone(task.id, checked)}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm transition-colors duration-200 ${
              isDone ? "text-slate-500 line-through" : "text-slate-100"
            }`}
          >
            {getDisplayText(task)}
          </p>
          <p className={`mt-0.5 text-xs ${isDone ? "text-slate-600" : "text-slate-500"}`}>
            {statusLabel}
            {task.deadline ? (
              <>
                {statusLabel ? " · " : ""}
                <span className={deadlinePast ? "text-red-400" : "text-amber-400/90"}>
                  Son: {formatTaskDeadline(task.deadline)}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!isDone ? (
            <TaskEditMenu
              currentQuadrant={task.quadrant}
              onQuadrantChange={(next) => onQuadrantChange(task.id, next)}
              onReschedule={(mode, customStartAt) => onReschedule(task.id, mode, customStartAt)}
            />
          ) : null}
          <button
            type="button"
            aria-label="Görevi sil"
            onClick={() => onDelete(task.id)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-base text-slate-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}

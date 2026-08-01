"use client";

import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import {
  QUADRANT_LABELS,
  QUADRANT_ROW_STYLES,
} from "@/lib/quadrant";
import { PriorityDropdown } from "./PriorityDropdown";
import { TaskCheckbox } from "./TaskCheckbox";

interface TaskRowCardProps {
  task: TaskRow;
  onDelete: (taskId: string) => void;
  onQuadrantChange: (taskId: string, quadrant: EisenhowerQuadrant) => void;
  onToggleDone: (taskId: string, done: boolean) => void;
}

function getDisplayText(task: TaskRow): string {
  return task.title?.trim() || task.raw_text.trim();
}

function getSubtitle(task: TaskRow): string {
  if (task.quadrant) {
    return QUADRANT_LABELS[task.quadrant];
  }
  if (task.status === "analyzing") return "AI analiz ediyor...";
  if (task.status === "needs_user_input") return "AI belirleyemedi, sen sec";
  return "Oncelik belirlenmedi";
}

export function TaskRowCard({
  task,
  onDelete,
  onQuadrantChange,
  onToggleDone,
}: TaskRowCardProps) {
  const isDone = task.status === "done";
  const quadrant = task.quadrant;
  const rowStyle = isDone
    ? "border border-slate-800 bg-slate-900/30 opacity-60"
    : quadrant
      ? QUADRANT_ROW_STYLES[quadrant]
      : "border border-dashed border-slate-600 bg-slate-900/40";

  return (
    <article
      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-200 ${rowStyle}`}
    >
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
          {getSubtitle(task)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isDone ? (
          <PriorityDropdown
            variant="icon"
            value={task.quadrant}
            onChange={(next) => {
              if (next) onQuadrantChange(task.id, next);
            }}
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
    </article>
  );
}

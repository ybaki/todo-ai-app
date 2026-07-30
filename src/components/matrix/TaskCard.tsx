"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TaskRow } from "@/types/database";

interface TaskCardProps {
  task: TaskRow;
  onOpenSuggestion?: (taskId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  suggested: "bg-amber-400",
  confirmed: "bg-blue-400",
  scheduled: "bg-emerald-400",
  conflicted: "bg-red-400",
  reschedule_suggested: "bg-red-400",
  done: "bg-slate-500",
};

export function TaskCard({ task, onOpenSuggestion }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-100">{task.title ?? task.raw_text}</p>
        {STATUS_DOT[task.status] ? (
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {task.estimated_minutes ? <span>{task.estimated_minutes} dk</span> : null}
        {task.deadline ? (
          <span>{new Date(task.deadline).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</span>
        ) : null}
        {task.confidence ? <span>güven %{Math.round(task.confidence * 100)}</span> : null}
      </div>
      {task.status === "suggested" && onOpenSuggestion ? (
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onOpenSuggestion(task.id)}
          className="mt-2 w-full rounded bg-amber-500/90 px-2 py-1 text-xs font-medium text-slate-950 hover:bg-amber-400"
        >
          Zaman öner
        </button>
      ) : null}
    </div>
  );
}

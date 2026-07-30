"use client";

import { useDroppable } from "@dnd-kit/core";
import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { QUADRANT_ACCENT, QUADRANT_LABELS } from "@/lib/quadrant";
import { TaskCard } from "./TaskCard";

interface QuadrantColumnProps {
  quadrant: EisenhowerQuadrant;
  tasks: TaskRow[];
  onOpenSuggestion: (taskId: string) => void;
}

export function QuadrantColumn({ quadrant, tasks, onOpenSuggestion }: QuadrantColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[180px] flex-col gap-2 rounded-xl border p-3 transition ${QUADRANT_ACCENT[quadrant]} ${
        isOver ? "ring-2 ring-blue-400" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-slate-200">{QUADRANT_LABELS[quadrant]}</h3>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenSuggestion={onOpenSuggestion} />
        ))}
      </div>
    </div>
  );
}

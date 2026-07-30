"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { QUADRANT_ORDER } from "@/lib/quadrant";
import { QuadrantColumn } from "./QuadrantColumn";

interface EisenhowerMatrixProps {
  tasks: TaskRow[];
  onQuadrantChange: (taskId: string, quadrant: EisenhowerQuadrant) => void;
  onOpenSuggestion: (taskId: string) => void;
}

// FR-08: Gorevler matris alanlari arasinda surukle-birak ile tasinabilmelidir.
export function EisenhowerMatrix({ tasks, onQuadrantChange, onOpenSuggestion }: EisenhowerMatrixProps) {
  const placedTasks = tasks.filter((task) => task.quadrant && task.status !== "done");

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const targetQuadrant = over.id as EisenhowerQuadrant;
    if (!QUADRANT_ORDER.includes(targetQuadrant)) return;
    onQuadrantChange(active.id as string, targetQuadrant);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUADRANT_ORDER.map((quadrant) => (
          <QuadrantColumn
            key={quadrant}
            quadrant={quadrant}
            tasks={placedTasks.filter((task) => task.quadrant === quadrant)}
            onOpenSuggestion={onOpenSuggestion}
          />
        ))}
      </div>
    </DndContext>
  );
}

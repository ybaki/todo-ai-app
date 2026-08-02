"use client";

import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { sortTasksForList, taskMatchesSearch } from "@/lib/quadrant";
import type { TimeSuggestMode } from "./TaskEditMenu";
import { TaskRowCard } from "./TaskRowCard";

interface TaskListProps {
  tasks: TaskRow[];
  searchQuery: string;
  onDelete: (taskId: string) => void;
  onQuadrantChange: (taskId: string, quadrant: EisenhowerQuadrant) => void;
  onReschedule: (taskId: string, mode: TimeSuggestMode, customStartAt?: string) => void | Promise<void>;
  onToggleDone: (taskId: string, done: boolean) => void;
}

export function TaskList({
  tasks,
  searchQuery,
  onDelete,
  onQuadrantChange,
  onReschedule,
  onToggleDone,
}: TaskListProps) {
  const visible = sortTasksForList(tasks).filter((task) => taskMatchesSearch(task, searchQuery));

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        {searchQuery.trim() ? "Aramanızla eşleşen görev yok." : "Henüz görev yok. Yukarıdan ekleyin."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {visible.map((task) => (
        <li key={task.id}>
          <TaskRowCard
            task={task}
            onDelete={onDelete}
            onQuadrantChange={onQuadrantChange}
            onReschedule={onReschedule}
            onToggleDone={onToggleDone}
          />
        </li>
      ))}
    </ul>
  );
}

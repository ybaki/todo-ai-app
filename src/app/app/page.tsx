"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { TaskList } from "@/components/tasks/TaskList";
import type { EisenhowerQuadrant } from "@/types/database";

export default function AppDashboardPage() {
  const { tasks, createTask, analyzeTask, updateTask, deleteTask } = useTasks();
  const [searchQuery, setSearchQuery] = useState("");

  async function handleCreateTask(rawText: string, quadrant?: EisenhowerQuadrant) {
    const task = await createTask(rawText, quadrant);
    await analyzeTask(task.id);

    if (quadrant) {
      await updateTask(task.id, { quadrant, status: "suggested" });
    }
  }

  async function handleQuadrantChange(taskId: string, quadrant: EisenhowerQuadrant) {
    await updateTask(taskId, { quadrant, status: "suggested" });
  }

  async function handleToggleDone(taskId: string, done: boolean) {
    await updateTask(taskId, { status: done ? "done" : "inbox" });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <TaskComposer
        onSubmit={handleCreateTask}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <TaskList
        tasks={tasks}
        searchQuery={searchQuery}
        onDelete={(id) => void deleteTask(id)}
        onQuadrantChange={(id, quadrant) => void handleQuadrantChange(id, quadrant)}
        onToggleDone={(id, done) => void handleToggleDone(id, done)}
      />
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useOverdueScheduledTasks } from "@/hooks/useOverdueScheduledTasks";
import { filterTasksForMainList } from "@/lib/tasks/overdueScheduled";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import {
  createTaskCreatedMessage,
  TaskToastStack,
  type TaskToastItem,
} from "@/components/tasks/TaskToast";
import { QuickNotesPanel } from "@/components/tasks/QuickNotesPanel";
import { ScrollPanel } from "@/components/tasks/ScrollPanel";
import { TaskList } from "@/components/tasks/TaskList";
import type { TimeSuggestMode } from "@/components/tasks/TaskEditMenu";
import type { EisenhowerQuadrant } from "@/types/database";
import type { TaskDurationPreset } from "@/lib/taskSize";
import { normalizeQuadrant } from "@/lib/quadrant";

function createToastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AppDashboardPage() {
  const { tasks, createTask, analyzeTask, updateTask, deleteTask, refresh } = useTasks();
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0);
  const [toasts, setToasts] = useState<TaskToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string) => {
    setToasts((current) => [...current, { id: createToastId(), message }]);
  }, []);

  async function handleCreateTask(
    rawText: string,
    options?: {
      quadrant?: EisenhowerQuadrant;
      deadline?: string | null;
      taskDuration?: TaskDurationPreset | null;
    }
  ) {
    const task = await createTask(rawText, options);
    const analyzeResult = await analyzeTask(task.id);

    let finalTask = analyzeResult.task ?? task;
    if (options?.quadrant) {
      finalTask = await updateTask(task.id, { quadrant: options.quadrant, status: "suggested" });
    }

    showToast(
      createTaskCreatedMessage(
        normalizeQuadrant(finalTask.quadrant) ?? normalizeQuadrant(options?.quadrant)
      )
    );
    setCalendarRefreshToken((current) => current + 1);
  }

  async function handleQuadrantChange(taskId: string, quadrant: EisenhowerQuadrant) {
    await updateTask(taskId, { quadrant, status: "suggested" });
    setCalendarRefreshToken((current) => current + 1);
  }

  async function handleReschedule(
    taskId: string,
    mode: TimeSuggestMode,
    customStartAt?: string
  ) {
    const response = await fetch(`/api/tasks/${taskId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, startAt: customStartAt }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message ?? "Zaman onerisi uygulanamadi");
    }
    await refresh();
    setCalendarRefreshToken((current) => current + 1);
  }

  async function handleCalendarQuadrantChange(taskId: string, quadrant: EisenhowerQuadrant) {
    await handleQuadrantChange(taskId, quadrant);
  }

  async function handleToggleDone(taskId: string, done: boolean) {
    await updateTask(taskId, { status: done ? "done" : "inbox" });
  }

  const calendarRefreshKey =
    tasks.reduce((latest, task) => Math.max(latest, new Date(task.updated_at).getTime()), 0) +
    calendarRefreshToken;

  const overdueScheduledItems = useOverdueScheduledTasks(tasks, calendarRefreshKey, () => {
    void refresh();
    setCalendarRefreshToken((current) => current + 1);
  });

  const tasksForList = filterTasksForMainList(tasks, overdueScheduledItems);

  return (
    <div className="relative flex flex-col gap-5 lg:gap-6">
      <TaskToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Mobil: ust uste */}
      <div className="flex flex-col gap-4 lg:hidden">
        <TaskComposer onSubmit={handleCreateTask} />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Görevlerde ara..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
        />
        <ScrollPanel>
          <TaskList
            tasks={tasksForList}
            searchQuery={searchQuery}
            onDelete={(id) => void deleteTask(id)}
            onQuadrantChange={(id, quadrant) => void handleQuadrantChange(id, quadrant)}
            onReschedule={(id, mode, customStartAt) => void handleReschedule(id, mode, customStartAt)}
            onToggleDone={(id, done) => void handleToggleDone(id, done)}
          />
        </ScrollPanel>
        <WeeklyCalendar
          refreshKey={calendarRefreshKey}
          onReschedule={(id, mode, customStartAt) => handleReschedule(id, mode, customStartAt)}
          onQuadrantChange={(id, quadrant) => handleCalendarQuadrantChange(id, quadrant)}
          onTasksChanged={refresh}
        />
      </div>

      {/* Masaustu: composer | gorevler (genis) | hizli notlar (dar, dikine) */}
      <div className="hidden lg:flex lg:min-h-0 lg:flex-col lg:gap-6">
        <div className="grid min-h-[min(520px,calc(100vh-20rem))] grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(260px,340px)] items-stretch gap-6 xl:gap-8">
          <aside className="sticky top-0 z-20 self-start rounded-xl">
            <TaskComposer onSubmit={handleCreateTask} compact />
          </aside>

          <section className="flex h-full min-h-0 min-w-0 flex-col gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Görevlerde ara..."
              className="w-full shrink-0 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
            <ScrollPanel className="min-h-0 flex-1" maxHeightClassName="h-full max-h-none">
              <TaskList
                tasks={tasksForList}
                searchQuery={searchQuery}
                onDelete={(id) => void deleteTask(id)}
                onQuadrantChange={(id, quadrant) => void handleQuadrantChange(id, quadrant)}
                onReschedule={(id, mode, customStartAt) =>
                  void handleReschedule(id, mode, customStartAt)
                }
                onToggleDone={(id, done) => void handleToggleDone(id, done)}
              />
            </ScrollPanel>
          </section>

          <QuickNotesPanel
            className="min-h-[460px]"
            fillHeight
            overdueItems={overdueScheduledItems}
            onMarkDone={(id) => void handleToggleDone(id, true)}
            onReschedule={(id, mode) => void handleReschedule(id, mode)}
          />
        </div>

        <WeeklyCalendar
          className="w-full min-w-0"
          visibleHours={12}
          refreshKey={calendarRefreshKey}
          onReschedule={(id, mode, customStartAt) => handleReschedule(id, mode, customStartAt)}
          onQuadrantChange={(id, quadrant) => handleCalendarQuadrantChange(id, quadrant)}
          onTasksChanged={refresh}
        />
      </div>
    </div>
  );
}

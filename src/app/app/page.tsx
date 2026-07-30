"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { QuickAddBox } from "@/components/inbox/QuickAddBox";
import { InboxList } from "@/components/inbox/InboxList";
import { EisenhowerMatrix } from "@/components/matrix/EisenhowerMatrix";
import { SuggestionBubble } from "@/components/matrix/SuggestionBubble";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import type { EisenhowerQuadrant } from "@/types/database";

// Dokuman bolum 4.1 ekran yerlesimi: SOL Hizli Girisi, SAG Matris, ALT Takvim.
export default function AppDashboardPage() {
  const { tasks, createTask, analyzeTask, updateTask, deleteTask } = useTasks();
  const [suggestionTaskId, setSuggestionTaskId] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const suggestionTask = tasks.find((task) => task.id === suggestionTaskId) ?? null;

  async function handleCreateTask(rawText: string) {
    const task = await createTask(rawText);
    void analyzeTask(task.id);
  }

  async function handleQuadrantChange(taskId: string, quadrant: EisenhowerQuadrant) {
    await updateTask(taskId, { quadrant });
  }

  async function handleManualQuadrant(taskId: string, quadrant: EisenhowerQuadrant | null) {
    if (!quadrant) return;
    await updateTask(taskId, { quadrant, status: "suggested" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hızlı Görev Girişi
          </h2>
          <QuickAddBox onSubmit={handleCreateTask} />
          <InboxList
            tasks={tasks}
            onAnalyze={(id) => void analyzeTask(id)}
            onManualQuadrant={(id, quadrant) => void handleManualQuadrant(id, quadrant)}
            onDelete={(id) => void deleteTask(id)}
          />
        </section>

        <section className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eisenhower Matrisi
          </h2>
          <EisenhowerMatrix
            tasks={tasks}
            onQuadrantChange={(id, quadrant) => void handleQuadrantChange(id, quadrant)}
            onOpenSuggestion={setSuggestionTaskId}
          />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Haftalık Takvim
        </h2>
        <WeeklyCalendar refreshKey={calendarRefreshKey} />
      </section>

      {suggestionTask ? (
        <SuggestionBubble
          task={suggestionTask}
          onClose={() => setSuggestionTaskId(null)}
          onScheduled={() => setCalendarRefreshKey((key) => key + 1)}
        />
      ) : null}
    </div>
  );
}

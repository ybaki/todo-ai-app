"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskDurationPreset } from "@/lib/taskSize";
import type { TaskRow } from "@/types/database";

interface AnalyzeResponse {
  task?: TaskRow;
  analysis: unknown;
  error?: string;
}

/**
 * Tasks icin merkezi istemci-taraf durum yonetimi. MVP kapsaminda basit
 * fetch + optimistic update kullanilir; realtime abonelik ileriki fazda
 * eklenebilir (Supabase Realtime).
 */
export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Gorevler yuklenemedi");
      const data = (await response.json()) as { tasks: TaskRow[] };
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ilk yukleme icin kasitli olarak refresh() cagriliyor; isLoading zaten
    // useState(true) ile baslatildigi icin ekstra bir render dongusune
    // sebep olmuyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const createTask = useCallback(
    async (
      rawText: string,
      options?: {
        quadrant?: TaskRow["quadrant"];
        deadline?: string | null;
        taskDuration?: TaskDurationPreset | null;
      }
    ) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText,
        source: "web",
        quadrant: options?.quadrant,
        deadline: options?.deadline ?? undefined,
        taskDuration: options?.taskDuration ?? undefined,
      }),
    });
    if (!response.ok) throw new Error("Gorev kaydedilemedi");
    const data = (await response.json()) as { task: TaskRow };
    setTasks((prev) => [data.task, ...prev]);
    return data.task;
  },
  []);

  const analyzeTask = useCallback(async (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: "analyzing" } : task))
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}/analyze`, { method: "POST" });
      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok) {
        await refresh();
        const message =
          typeof data.error === "string"
            ? data.error
            : (data as { message?: string }).message ?? "Analiz basarisiz";
        throw new Error(message);
      }

      if (data.task) {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? data.task : task)));
      } else {
        await refresh();
      }

      return data;
    } catch (error) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId && task.status === "analyzing" ? { ...task, status: "inbox" } : task
        )
      );
      throw error;
    }
  }, [refresh]);

  const updateTask = useCallback(async (taskId: string, patch: Record<string, unknown>) => {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...(patch as Partial<TaskRow>) } : task))
    );
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      setTasks(previous);
      throw new Error("Guncelleme basarisiz");
    }
    const data = (await response.json()) as { task: TaskRow };
    setTasks((prev) => prev.map((task) => (task.id === taskId ? data.task : task)));
    return data.task;
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!response.ok) {
      setTasks(previous);
      throw new Error("Silme basarisiz");
    }
  }, [tasks]);

  return { tasks, isLoading, error, refresh, createTask, analyzeTask, updateTask, deleteTask };
}

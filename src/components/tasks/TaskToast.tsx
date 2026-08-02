"use client";

import { useEffect } from "react";
import type { EisenhowerQuadrant } from "@/types/database";
import { QUADRANT_LABELS } from "@/lib/quadrant";

const VISIBLE_MS = 5000;

export interface TaskToastItem {
  id: string;
  message: string;
}

interface TaskToastStackProps {
  toasts: TaskToastItem[];
  onDismiss: (id: string) => void;
}

function TaskToast({
  toast,
  onDismiss,
}: {
  toast: TaskToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className="w-[min(340px,calc(100vw-2rem))] rounded-xl border border-slate-700/80 bg-slate-950/95 px-4 py-3 shadow-2xl ring-1 ring-slate-700/50 backdrop-blur-sm"
    >
      <p className="text-sm text-slate-100">{toast.message}</p>
    </div>
  );
}

/** Sag ust kosede kisa sureli bilgilendirme toastlari. */
export function TaskToastStack({ toasts, onDismiss }: TaskToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <TaskToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function createTaskCreatedMessage(quadrant?: EisenhowerQuadrant | null): string {
  if (quadrant) {
    return `${QUADRANT_LABELS[quadrant]} türü görev oluşturuldu`;
  }
  return "Görev oluşturuldu";
}

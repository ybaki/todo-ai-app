"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { EisenhowerQuadrant } from "@/types/database";
import type { TaskDurationPreset } from "@/lib/taskSize";
import { DeadlinePicker } from "./DeadlinePicker";
import { PriorityDropdown } from "./PriorityDropdown";
import { TaskDurationPicker } from "./TaskDurationPicker";

interface TaskComposerProps {
  onSubmit: (
    rawText: string,
    options?: {
      quadrant?: EisenhowerQuadrant;
      deadline?: string | null;
      taskDuration?: TaskDurationPreset | null;
    }
  ) => Promise<void>;
  compact?: boolean;
}

export function TaskComposer({ onSubmit, compact = false }: TaskComposerProps) {
  const [value, setValue] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<EisenhowerQuadrant | null>(null);
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<TaskDurationPreset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    setValue("");
    const quadrant = selectedQuadrant ?? undefined;
    const deadline = selectedDeadline;
    const taskDuration = selectedDuration;
    setSelectedQuadrant(null);
    setSelectedDeadline(null);
    setSelectedDuration(null);
    try {
      await onSubmit(trimmed, {
        quadrant,
        deadline: deadline ?? undefined,
        taskDuration: taskDuration ?? undefined,
      });
      textareaRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const canSubmit = value.trim().length > 0 && !isSubmitting;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Yapılacak işler buraya yaz, Enter ile kaydet..."
        rows={compact ? 3 : 2}
        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
      />
      <div className={`mt-2 flex flex-wrap items-center gap-2 ${compact ? "flex-col items-stretch" : ""}`}>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Kaydediliyor..." : "Oluştur"}
        </button>

        <div className={`flex flex-wrap gap-2 ${compact ? "w-full" : ""}`}>
          <PriorityDropdown value={selectedQuadrant} onChange={setSelectedQuadrant} />
          <DeadlinePicker value={selectedDeadline} onChange={setSelectedDeadline} />
          <TaskDurationPicker value={selectedDuration} onChange={setSelectedDuration} />
        </div>

        {!compact ? (
          <span className="ml-auto text-xs text-slate-500">
            Enter veya Oluştur · Shift+Enter: yeni satır
          </span>
        ) : (
          <span className="text-xs text-slate-500">Enter · Shift+Enter: yeni satır</span>
        )}
      </div>
    </div>
  );
}

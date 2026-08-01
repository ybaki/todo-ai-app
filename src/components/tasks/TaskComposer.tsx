"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { EisenhowerQuadrant } from "@/types/database";
import { PriorityDropdown } from "./PriorityDropdown";

interface TaskComposerProps {
  onSubmit: (rawText: string, quadrant?: EisenhowerQuadrant) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TaskComposer({ onSubmit, searchQuery, onSearchChange }: TaskComposerProps) {
  const [value, setValue] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<EisenhowerQuadrant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    setValue("");
    const quadrant = selectedQuadrant ?? undefined;
    setSelectedQuadrant(null);
    try {
      await onSubmit(trimmed, quadrant);
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
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Yapılacak işler buraya yaz, Enter ile kaydet..."
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Kaydediliyor..." : "Oluştur"}
          </button>

          <PriorityDropdown value={selectedQuadrant} onChange={setSelectedQuadrant} />

          <button
            type="button"
            disabled
            title="Yakında eklenecek"
            className="cursor-not-allowed rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-500"
          >
            Deadline
          </button>

          <span className="ml-auto text-xs text-slate-500">
            Enter veya Oluştur · Shift+Enter: yeni satır
          </span>
        </div>
      </div>

      <input
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Görevlerde ara..."
        className="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
      />
    </div>
  );
}

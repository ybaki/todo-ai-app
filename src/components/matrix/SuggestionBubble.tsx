"use client";

import { useEffect, useState } from "react";
import type { ScheduleSuggestionRow, TaskRow } from "@/types/database";
import { QUADRANT_LABELS } from "@/lib/quadrant";

interface SuggestionBubbleProps {
  task: TaskRow;
  onClose: () => void;
  onScheduled: () => void;
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const startLabel = start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${startLabel}–${endLabel}`;
}

// Dokuman bolum 4.3: "Onayla / Matrisi degistir / Sureyi degistir / Baska saat / Sadece kaydet".
export function SuggestionBubble({ task, onClose, onScheduled }: SuggestionBubbleProps) {
  const [suggestions, setSuggestions] = useState<ScheduleSuggestionRow[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tasks/${task.id}/schedule`, { method: "POST" });
        if (!response.ok) throw new Error("Zaman onerisi uretilemedi");
        const data = (await response.json()) as { suggestions: ScheduleSuggestionRow[] };
        if (!cancelled) setSuggestions(data.suggestions);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const active = suggestions[activeIndex];

  async function handleAccept() {
    if (!active) return;
    const response = await fetch(`/api/tasks/${task.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: active.id }),
    });
    if (response.ok) {
      onScheduled();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl">
        <p className="text-sm text-slate-400">
          {task.quadrant ? QUADRANT_LABELS[task.quadrant] : "Sınıflandırılmadı"} olarak değerlendirdim.
        </p>
        <h3 className="mt-1 text-base font-semibold">{task.title ?? task.raw_text}</h3>
        <p className="mt-1 text-sm text-slate-400">
          Tahmini süre: {task.estimated_minutes ?? "-"} dakika
        </p>

        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
          {isLoading ? (
            <p className="text-sm text-slate-400">Uygun saat aranıyor...</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : active ? (
            <>
              <p className="text-sm font-medium text-slate-100">{formatRange(active.start_at, active.end_at)}</p>
              <p className="mt-1 text-xs text-slate-500">Gerekçe: {active.reason}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Uygun bir slot bulunamadı; çalışma tercihlerinizi gözden geçirin.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleAccept}
            disabled={!active}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Onayla
          </button>
          <button
            onClick={() => setActiveIndex((index) => (index + 1) % Math.max(suggestions.length, 1))}
            disabled={suggestions.length <= 1}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 disabled:opacity-50"
          >
            Başka saat
          </button>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
          >
            Sadece kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

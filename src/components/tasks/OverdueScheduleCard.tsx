"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { TimeSuggestMode } from "@/components/tasks/TaskEditMenu";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import type { OverdueScheduledItem } from "@/lib/tasks/overdueScheduled";
import { TIME_SUGGEST_OPTIONS } from "@/lib/tasks/timeSuggestOptions";
import {
  DEFAULT_QUADRANT,
  QUADRANT_CARD_STYLES,
  QUADRANT_LABELS,
  normalizeQuadrant,
} from "@/lib/quadrant";
import type { EisenhowerQuadrant } from "@/types/database";

interface OverdueScheduleCardProps {
  item: OverdueScheduledItem;
  onMarkDone: (taskId: string) => void | Promise<void>;
  onReschedule: (taskId: string, mode: TimeSuggestMode) => void | Promise<void>;
}

function formatBlockRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dayLabel = format(start, "d MMM", { locale: tr });
  return `${dayLabel} · ${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

export function OverdueScheduleCard({ item, onMarkDone, onReschedule }: OverdueScheduleCardProps) {
  const [timeOpen, setTimeOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const quadrant: EisenhowerQuadrant =
    normalizeQuadrant(item.quadrant) ?? DEFAULT_QUADRANT;

  async function handleDone() {
    setIsBusy(true);
    try {
      await onMarkDone(item.taskId);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReschedule(mode: TimeSuggestMode) {
    setIsBusy(true);
    try {
      await onReschedule(item.taskId, mode);
      setTimeOpen(false);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article
      className={`relative rounded-lg border p-3 pr-10 ${QUADRANT_CARD_STYLES[quadrant]}`}
    >
      <div className="absolute right-2 top-2">
        <TaskCheckbox checked={false} disabled={isBusy} onChange={() => void handleDone()} />
      </div>

      <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
      <p className="mt-1 text-[11px] text-slate-400">{formatBlockRange(item.startAt, item.endAt)}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{QUADRANT_LABELS[quadrant]}</p>

      <div className="mt-2 border-t border-slate-700/40 pt-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setTimeOpen((current) => !current)}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs text-slate-300 transition hover:bg-slate-900/40 disabled:opacity-50"
          aria-expanded={timeOpen}
        >
          <span className="text-base leading-none" aria-hidden>
            ↻
          </span>
          <span>Zaman öner</span>
          <span className="ml-auto text-slate-500">{timeOpen ? "▴" : "▾"}</span>
        </button>

        {timeOpen ? (
          <ul className="mt-1 space-y-0.5 rounded-md border border-slate-700/60 bg-slate-950/60 py-1">
            {TIME_SUGGEST_OPTIONS.map((option) => (
              <li key={option.mode}>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleReschedule(option.mode)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

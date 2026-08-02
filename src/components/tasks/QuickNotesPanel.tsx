"use client";

import type { TimeSuggestMode } from "@/components/tasks/TaskEditMenu";
import type { OverdueScheduledItem } from "@/lib/tasks/overdueScheduled";
import { OverdueScheduleCard } from "./OverdueScheduleCard";

interface QuickNotesPanelProps {
  overdueItems?: OverdueScheduledItem[];
  onMarkDone?: (taskId: string) => void | Promise<void>;
  onReschedule?: (taskId: string, mode: TimeSuggestMode) => void | Promise<void>;
  className?: string;
  /** Masaustu: orta kolonu takvime kadar doldurur. */
  fillHeight?: boolean;
}

/** Orta panel: plani gecen gorev kartlari + bos not alani. */
export function QuickNotesPanel({
  overdueItems = [],
  onMarkDone,
  onReschedule,
  className = "",
  fillHeight = false,
}: QuickNotesPanelProps) {
  const hasOverdue = overdueItems.length > 0;

  return (
    <section
      className={`flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4 ${
        fillHeight ? "h-full min-h-0" : "min-h-[220px] flex-1"
      } ${className}`}
    >
      <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Hızlı Notlar
      </h2>

      {hasOverdue ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
          {overdueItems.map((item) => (
            <OverdueScheduleCard
              key={`${item.taskId}-${item.blockId}`}
              item={item}
              onMarkDone={(taskId) => onMarkDone?.(taskId)}
              onReschedule={(taskId, mode) => onReschedule?.(taskId, mode)}
            />
          ))}
        </div>
      ) : (
        <div
          aria-hidden
          className={`mt-3 rounded-lg border border-dashed border-slate-800/70 bg-slate-950/20 ${
            fillHeight ? "min-h-0 flex-1" : "min-h-[160px] flex-1"
          }`}
        />
      )}
    </section>
  );
}

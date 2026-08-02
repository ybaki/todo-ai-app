"use client";

import { useRef, useState } from "react";
import { CalendarDatePicker } from "./CalendarDatePicker";

interface CalendarNavigationProps {
  rangeLabel: string;
  viewAnchor: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectWeek: (weekStart: Date) => void;
  onAssignTask?: () => void | Promise<void>;
  isAssigning?: boolean;
}

function NavIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
    >
      {children}
    </button>
  );
}

export function CalendarNavigation({
  rangeLabel,
  viewAnchor,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectWeek,
  onAssignTask,
  isAssigning = false,
}: CalendarNavigationProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5">
      <button
        type="button"
        disabled={isAssigning || !onAssignTask}
        onClick={() => void onAssignTask?.()}
        className="inline-flex h-9 items-center rounded-md border border-blue-600/60 bg-blue-600/20 px-3 text-sm font-medium text-blue-200 transition hover:border-blue-500 hover:bg-blue-600/30 disabled:opacity-50"
      >
        {isAssigning ? "Atanıyor..." : "Görev ata"}
      </button>

      <button
        type="button"
        onClick={onToday}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
      >
        <span aria-hidden className="text-base leading-none">
          📅
        </span>
        Bugün
      </button>

      <div className="flex items-center gap-1">
        <NavIconButton label="Önceki hafta" onClick={onPrevWeek}>
          ‹
        </NavIconButton>
        <NavIconButton label="Sonraki hafta" onClick={onNextWeek}>
          ›
        </NavIconButton>
      </div>

      <div ref={pickerRef} className="relative min-w-0">
        <button
          type="button"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((current) => !current)}
          className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          <span className="truncate capitalize">{rangeLabel}</span>
          <span className="text-slate-500">{pickerOpen ? "▲" : "▼"}</span>
        </button>

        {pickerOpen ? (
          <CalendarDatePicker
            anchorDate={viewAnchor}
            onSelectWeek={onSelectWeek}
            onClose={() => setPickerOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

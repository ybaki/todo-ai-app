"use client";

import { useEffect, useRef, useState } from "react";

export type CalendarEditMode = "block" | "delete" | null;

interface CalendarEditMenuProps {
  mode: CalendarEditMode;
  onModeChange: (mode: CalendarEditMode) => void;
  onAddMeeting: () => void;
}

export function CalendarEditMenu({ mode, onModeChange, onAddMeeting }: CalendarEditMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectMode(next: CalendarEditMode) {
    onModeChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Takvimi düzenle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-11 items-center justify-center rounded-lg border text-base transition ${
          mode
            ? "border-blue-500 bg-blue-500/15 text-blue-300"
            : "border-slate-600 bg-slate-900 text-slate-300 hover:border-blue-500 hover:text-blue-300"
        }`}
      >
        ✎
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-30 min-w-[160px] overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onAddMeeting();
              setOpen(false);
            }}
            className="block w-full px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Toplantı ekle
          </button>
          <button
            type="button"
            onClick={() => selectMode(mode === "block" ? null : "block")}
            className={`block w-full px-3 py-2.5 text-left text-sm transition hover:bg-slate-800 ${
              mode === "block" ? "bg-slate-800 text-blue-300" : "text-slate-200"
            }`}
          >
            Blokla
          </button>
          <button
            type="button"
            onClick={() => selectMode(mode === "delete" ? null : "delete")}
            className={`block w-full px-3 py-2.5 text-left text-sm transition hover:bg-slate-800 ${
              mode === "delete" ? "bg-slate-800 text-red-300" : "text-slate-200"
            }`}
          >
            Sil
          </button>
          {mode ? (
            <button
              type="button"
              onClick={() => selectMode(null)}
              className="block w-full border-t border-slate-800 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-800"
            >
              Düzenlemeyi bitir
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

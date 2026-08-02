"use client";

import { useEffect, useRef, useState } from "react";
import {
  TASK_DURATION_CONFIG,
  TASK_DURATION_ORDER,
  type TaskDurationPreset,
} from "@/lib/taskSize";

interface TaskDurationPickerProps {
  value: TaskDurationPreset | null;
  onChange: (value: TaskDurationPreset | null) => void;
  disabled?: boolean;
}

export function TaskDurationPicker({ value, onChange, disabled = false }: TaskDurationPickerProps) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 ${
          value
            ? "border-violet-600/60 bg-violet-950/30 text-violet-100"
            : "border-slate-600 bg-slate-800 text-slate-100"
        }`}
      >
        <span>İş Büyüklüğü</span>
        <span className="text-slate-500">▾</span>
        {value ? (
          <span className="text-xs font-normal text-violet-300">
            · {TASK_DURATION_CONFIG[value].label}
          </span>
        ) : null}
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 z-40 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
        >
          {TASK_DURATION_ORDER.map((preset) => (
            <li key={preset} role="option" aria-selected={value === preset}>
              <button
                type="button"
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-800 ${
                  value === preset ? "bg-slate-800/80 text-violet-300" : "text-slate-200"
                }`}
              >
                {TASK_DURATION_CONFIG[preset].label}
              </button>
            </li>
          ))}
          <li className="border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-800"
            >
              AI belirlesin
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

/** Geriye donuk export. */
export { TaskDurationPicker as TaskSizePicker };

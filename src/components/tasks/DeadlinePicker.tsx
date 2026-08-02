"use client";

import { useEffect, useRef, useState } from "react";
import { formatTaskDeadline, fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/deadline";

interface DeadlinePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  variant?: "default" | "icon";
  disabled?: boolean;
}

export function DeadlinePicker({
  value,
  onChange,
  variant = "default",
  disabled = false,
}: DeadlinePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDatetimeLocalValue(value));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(toDatetimeLocalValue(value));
  }, [open, value]);

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

  function applyDraft() {
    onChange(fromDatetimeLocalValue(draft));
    setOpen(false);
  }

  const triggerClass =
    variant === "icon"
      ? "flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-sm text-slate-300 hover:border-amber-500 hover:text-amber-300"
      : `flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-amber-500 ${
          value
            ? "border-amber-600/60 bg-amber-950/30 text-amber-100"
            : "border-slate-600 bg-slate-800 text-slate-100"
        }`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {variant === "icon" ? (
          "⏱"
        ) : (
          <>
            <span>Deadline</span>
            <span className="text-slate-500">▾</span>
            {value ? (
              <span className="text-xs font-normal text-amber-300">· {formatTaskDeadline(value)}</span>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Deadline sec"
          className={`absolute z-40 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl ${
            variant === "icon" ? "right-0" : "left-0"
          }`}
        >
          <p className="mb-2 text-xs font-medium text-slate-400">Bu is ne zamana kadar yapilmali?</p>
          <input
            type="datetime-local"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 [color-scheme:dark]"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={applyDraft}
              disabled={!draft.trim()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kaydet
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setDraft("");
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                Temizle
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

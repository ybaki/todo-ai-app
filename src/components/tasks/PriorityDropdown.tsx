"use client";

import { useEffect, useRef, useState } from "react";
import type { EisenhowerQuadrant } from "@/types/database";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/lib/quadrant";

interface PriorityDropdownProps {
  value: EisenhowerQuadrant | null;
  onChange: (value: EisenhowerQuadrant | null) => void;
  /** Ana buton metni; seciliyse yaninda etiket gosterilir. */
  label?: string;
  /** Kart duzenleme icin kucuk tetikleyici. */
  variant?: "default" | "icon";
  disabled?: boolean;
}

export function PriorityDropdown({
  value,
  onChange,
  label = "Öncelik Durumu",
  variant = "default",
  disabled = false,
}: PriorityDropdownProps) {
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

  const triggerClass =
    variant === "icon"
      ? "flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-sm text-slate-300 hover:border-blue-500 hover:text-blue-300"
      : "flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:border-blue-500";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {variant === "icon" ? (
          "✎"
        ) : (
          <>
            <span>{label}</span>
            <span className="text-slate-500">▾</span>
            {value ? (
              <span className="text-xs font-normal text-blue-300">· {QUADRANT_LABELS[value]}</span>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <ul
          role="listbox"
          className={`absolute z-40 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl ${
            variant === "icon" ? "right-0" : "left-0"
          }`}
        >
          {QUADRANT_ORDER.map((quadrant) => (
            <li key={quadrant} role="option" aria-selected={value === quadrant}>
              <button
                type="button"
                onClick={() => {
                  onChange(quadrant);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-800 ${
                  value === quadrant ? "bg-slate-800/80 text-blue-300" : "text-slate-200"
                }`}
              >
                {QUADRANT_LABELS[quadrant]}
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
              Seçimi temizle
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

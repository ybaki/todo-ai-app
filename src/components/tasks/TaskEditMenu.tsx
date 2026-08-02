"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EisenhowerQuadrant } from "@/types/database";
import { fromDatetimeLocalValue } from "@/lib/deadline";
import { TIME_SUGGEST_OPTIONS, type TimeSuggestMode } from "@/lib/tasks/timeSuggestOptions";
import { QUADRANT_LABELS, QUADRANT_HINTS, QUADRANT_ORDER, normalizeQuadrant } from "@/lib/quadrant";

export type { TimeSuggestMode };

interface TaskEditMenuProps {
  currentQuadrant?: EisenhowerQuadrant | null;
  onQuadrantChange?: (quadrant: EisenhowerQuadrant) => void | Promise<void>;
  onReschedule?: (mode: TimeSuggestMode, customStartAt?: string) => void | Promise<void>;
  variant?: "card" | "calendar";
  disabled?: boolean;
}

const TIME_OPTIONS = TIME_SUGGEST_OPTIONS;

const MENU_WIDTH = 248;

function getMenuPosition(
  triggerRect: DOMRect,
  variant: "card" | "calendar"
): { top: number; left: number } {
  const gap = 4;
  let left = variant === "calendar" ? triggerRect.right - MENU_WIDTH : triggerRect.left;
  let top = triggerRect.bottom + gap;

  if (left + MENU_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - MENU_WIDTH - 8;
  }
  if (left < 8) left = 8;

  const estimatedHeight = 120;
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, triggerRect.top - estimatedHeight - gap);
  }

  return { top, left };
}

export function TaskEditMenu({
  currentQuadrant,
  onQuadrantChange,
  onReschedule,
  variant = "card",
  disabled = false,
}: TaskEditMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<"priority" | "time" | null>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    setActiveSubmenu(null);
  }

  function updateMenuPosition() {
    if (!triggerRef.current) return;
    setMenuPosition(getMenuPosition(triggerRef.current.getBoundingClientRect(), variant));
  }

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [menuOpen, variant]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [menuOpen, variant]);

  async function handleQuadrant(quadrant: EisenhowerQuadrant) {
    if (!onQuadrantChange) return;
    setIsBusy(true);
    try {
      await onQuadrantChange(quadrant);
      closeMenu();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTime(mode: Exclude<TimeSuggestMode, "custom">) {
    if (!onReschedule) return;
    setIsBusy(true);
    try {
      await onReschedule(mode);
      closeMenu();
    } finally {
      setIsBusy(false);
    }
  }

  async function applyCustomTime() {
    if (!onReschedule || !customDraft.trim()) return;
    const iso = fromDatetimeLocalValue(customDraft);
    if (!iso) return;

    setIsBusy(true);
    try {
      await onReschedule("custom", iso);
      closeMenu();
      setCustomDraft("");
    } finally {
      setIsBusy(false);
    }
  }

  const triggerClass =
    variant === "calendar"
      ? "absolute right-0 top-0 z-20 flex h-5 w-5 items-center justify-center rounded bg-slate-950/90 text-[10px] text-slate-200 opacity-0 transition group-hover:opacity-100 hover:bg-slate-900"
      : "flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-sm text-slate-300 transition hover:border-blue-500 hover:text-blue-300";

  const menuPortal =
    menuOpen && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
            className="fixed z-[9999] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl ring-1 ring-black/20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative" onMouseEnter={() => setActiveSubmenu("priority")}>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <span>Öncelik öner</span>
                <span className="text-slate-500">›</span>
              </button>
              {activeSubmenu === "priority" ? (
                <ul className="absolute left-full top-0 z-[10000] ml-0.5 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl">
                  {QUADRANT_ORDER.map((quadrant) => (
                    <li key={quadrant}>
                      <button
                        type="button"
                        onClick={() => void handleQuadrant(quadrant)}
                        className={`block w-full px-4 py-2 text-left hover:bg-slate-800 ${
                          normalizeQuadrant(currentQuadrant ?? null) === quadrant
                            ? "text-blue-300"
                            : "text-slate-200"
                        }`}
                      >
                        <span className="block text-sm">{QUADRANT_LABELS[quadrant]}</span>
                        <span className="block text-[11px] leading-snug text-slate-500">
                          {QUADRANT_HINTS[quadrant]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="relative border-t border-slate-800" onMouseEnter={() => setActiveSubmenu("time")}>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <span>Zaman öner</span>
                <span className="text-slate-500">›</span>
              </button>
              {activeSubmenu === "time" ? (
                <div className="absolute left-full top-0 z-[10000] ml-0.5 min-w-[280px] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl">
                  {TIME_OPTIONS.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => void handleTime(option.mode)}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-800 px-3 py-2">
                    <p className="mb-1.5 text-xs text-slate-400">Özel ayarla</p>
                    <input
                      type="datetime-local"
                      value={customDraft}
                      onChange={(event) => setCustomDraft(event.target.value)}
                      className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 [color-scheme:dark]"
                    />
                    <button
                      type="button"
                      disabled={!customDraft.trim()}
                      onClick={() => void applyCustomTime()}
                      className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                    >
                      Uygula
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isBusy}
        aria-label="Gorevi duzenle"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
          setActiveSubmenu(null);
        }}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        ✎
      </button>
      {menuPortal}
    </>
  );
}

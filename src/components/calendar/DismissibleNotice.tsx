"use client";

interface DismissibleNoticeProps {
  message: string;
  onDismiss: () => void;
}

/** Sag ust kose; X ile kapanir. */
export function DismissibleNotice({ message, onDismiss }: DismissibleNoticeProps) {
  return (
    <div className="pointer-events-auto fixed right-4 top-4 z-[10000] w-[min(320px,calc(100vw-2rem))] rounded-lg border border-slate-700/80 bg-slate-950/95 px-3 py-2.5 shadow-xl ring-1 ring-slate-700/50 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-slate-100">{message}</p>
        <button
          type="button"
          aria-label="Kapat"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}

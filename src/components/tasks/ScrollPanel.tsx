import type { ReactNode } from "react";

interface ScrollPanelProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
}

/** Kart listesi ve takvim gibi bloklar icin dikey kaydirma kabugu. */
export function ScrollPanel({
  children,
  className = "",
  maxHeightClassName = "max-h-[min(38vh,360px)]",
}: ScrollPanelProps) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 ${className}`}
    >
      <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${maxHeightClassName}`}>{children}</div>
    </section>
  );
}

"use client";

import { useState, type KeyboardEvent } from "react";

interface QuickAddBoxProps {
  onSubmit: (rawText: string) => Promise<void>;
}

// Dokuman bolum 4.2 adim 1: "Kullanici metni yazar ve Enter'a basar."
// Hedef: < 1 saniyede kayit (FR-01, basari olcutu bolum 2.3).
export function QuickAddBox({ onSubmit }: QuickAddBoxProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    setValue("");
    try {
      await onSubmit(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ne yapman gerekiyor? Yazip Enter'a bas..."
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Enter: kaydet · Shift+Enter: yeni satir</span>
        {isSubmitting ? <span className="text-blue-400">Kaydediliyor...</span> : null}
      </div>
    </div>
  );
}

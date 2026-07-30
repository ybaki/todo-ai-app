"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileRow } from "@/types/database";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [extensionToken, setExtensionToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { profile: ProfileRow }) => setProfile(data.profile));
  }, []);

  async function handleSave() {
    if (!profile) return;
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workStart: profile.work_start,
          workEnd: profile.work_end,
          lunchStart: profile.lunch_start,
          lunchEnd: profile.lunch_end,
          bufferMinutes: profile.buffer_minutes,
          minFocusBlockMinutes: profile.min_focus_block_minutes,
          maxDailyFocusMinutes: profile.max_daily_focus_minutes,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateExtensionToken() {
    const response = await fetch("/api/ext/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Chrome eklentisi" }),
    });
    const data = (await response.json()) as { token: string };
    setExtensionToken(data.token);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Hesabınız ve TÜM verileriniz (görevler, planlar, Outlook bağlantısı) kalıcı olarak silinecek. Emin misiniz?"
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (response.ok) {
        router.push("/login");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (!profile) {
    return <p className="text-sm text-slate-400">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Çalışma Tercihleri
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Çalışma başlangıcı
            <input
              type="time"
              value={profile.work_start.slice(0, 5)}
              onChange={(e) => setProfile({ ...profile, work_start: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Çalışma bitişi
            <input
              type="time"
              value={profile.work_end.slice(0, 5)}
              onChange={(e) => setProfile({ ...profile, work_end: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Öğle arası başlangıcı
            <input
              type="time"
              value={profile.lunch_start?.slice(0, 5) ?? ""}
              onChange={(e) => setProfile({ ...profile, lunch_start: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Öğle arası bitişi
            <input
              type="time"
              value={profile.lunch_end?.slice(0, 5) ?? ""}
              onChange={(e) => setProfile({ ...profile, lunch_end: e.target.value })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Toplantı tamponu (dk)
            <input
              type="number"
              value={profile.buffer_minutes}
              onChange={(e) => setProfile({ ...profile, buffer_minutes: Number(e.target.value) })}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Minimum odak bloğu (dk)
            <input
              type="number"
              value={profile.min_focus_block_minutes}
              onChange={(e) =>
                setProfile({ ...profile, min_focus_block_minutes: Number(e.target.value) })
              }
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            />
          </label>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Outlook Bağlantısı
        </h2>
        <a
          href="/api/calendar/connect"
          className="inline-block rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
        >
          Outlook&apos;u bağla / yenile
        </a>
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Chrome Eklentisi
        </h2>
        <p className="text-sm text-slate-400">
          Eklentiyi kurduktan sonra aşağıdaki anahtarı üretip eklenti ayarlarına yapıştırın.
          Anahtar yalnızca bir kez gösterilir.
        </p>
        <button
          onClick={handleGenerateExtensionToken}
          className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
        >
          Yeni eklenti anahtarı üret
        </button>
        {extensionToken ? (
          <div className="rounded border border-amber-600/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <p className="mb-1 font-medium">Bu anahtarı şimdi kopyalayın, tekrar gösterilmeyecek:</p>
            <code className="break-all">{extensionToken}</code>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
          Tehlikeli Bölge
        </h2>
        <p className="text-sm text-slate-400">
          Hesabınızı ve tüm verilerinizi (görevler, planlar, Outlook bağlantısı, AI analiz
          geçmişi) kalıcı olarak siler. Bu işlem geri alınamaz.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="rounded border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10 disabled:opacity-60"
        >
          {isDeleting ? "Siliniyor..." : "Hesabımı ve verilerimi sil"}
        </button>
      </section>
    </div>
  );
}

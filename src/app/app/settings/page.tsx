"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileRow } from "@/types/database";
import {
  HoursBlock,
  QuadrantRadioGroup,
  sliceTime,
} from "@/components/settings/SchedulingPreferences";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [savedProfile, setSavedProfile] = useState<ProfileRow | null>(null);
  const [extensionToken, setExtensionToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { profile: ProfileRow }) => {
        setProfile(data.profile);
        setSavedProfile(data.profile);
      });
  }, []);

  const isDirty =
    profile && savedProfile ? JSON.stringify(profile) !== JSON.stringify(savedProfile) : false;

  function handleCancel() {
    if (savedProfile) {
      setProfile(savedProfile);
      setSaveMessage(null);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeStart: sliceTime(profile.active_start),
          activeEnd: sliceTime(profile.active_end),
          activeDays: profile.active_days,
          workStart: sliceTime(profile.work_start),
          workEnd: sliceTime(profile.work_end),
          workDays: profile.work_days,
          urgentScheduleMode: profile.urgent_schedule_mode,
          planScheduleMode: profile.plan_schedule_mode,
          getRidScheduleMode: profile.get_rid_schedule_mode,
          lunchStart: profile.lunch_start ? sliceTime(profile.lunch_start) : null,
          lunchEnd: profile.lunch_end ? sliceTime(profile.lunch_end) : null,
          bufferMinutes: profile.buffer_minutes,
          minFocusBlockMinutes: profile.min_focus_block_minutes,
          maxDailyFocusMinutes: profile.max_daily_focus_minutes,
        }),
      });
      const data = (await response.json()) as { profile?: ProfileRow; message?: string };
      if (!response.ok) {
        setSaveMessage(data.message ?? "Kaydedilemedi.");
        return;
      }
      if (data.profile) {
        setProfile(data.profile);
        setSavedProfile(data.profile);
        setSaveMessage("Kaydedildi.");
      }
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
      "Hesabınız ve TÜM verileriniz (görevler, planlar) kalıcı olarak silinecek. Emin misiniz?"
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
    <div className="mx-auto flex max-w-2xl flex-col gap-8 pb-24">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Kullanıcı Seçenekleri
        </h2>
        <p className="text-sm text-slate-400">
          Aktif Saatler, Çalışma Saatlerini kapsar. AI planlaması bu kurallara göre çalışır.
        </p>

        <HoursBlock
          title="Aktif Saatleri"
          days={profile.active_days}
          onDaysChange={(days) => setProfile({ ...profile, active_days: days })}
          start={sliceTime(profile.active_start)}
          end={sliceTime(profile.active_end)}
          onStartChange={(value) => setProfile({ ...profile, active_start: value })}
          onEndChange={(value) => setProfile({ ...profile, active_end: value })}
        />

        <HoursBlock
          title="Çalışma Saatleri"
          days={profile.work_days}
          onDaysChange={(days) => setProfile({ ...profile, work_days: days })}
          start={sliceTime(profile.work_start)}
          end={sliceTime(profile.work_end)}
          onStartChange={(value) => setProfile({ ...profile, work_start: value })}
          onEndChange={(value) => setProfile({ ...profile, work_end: value })}
        />

        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <QuadrantRadioGroup
            label="Aksiyon Al"
            value={profile.urgent_schedule_mode}
            onChange={(value) => setProfile({ ...profile, urgent_schedule_mode: value })}
          />
          <QuadrantRadioGroup
            label="Planla"
            value={profile.plan_schedule_mode}
            onChange={(value) => setProfile({ ...profile, plan_schedule_mode: value })}
          />
          <QuadrantRadioGroup
            label="Kurtul"
            value={profile.get_rid_schedule_mode}
            onChange={(value) => setProfile({ ...profile, get_rid_schedule_mode: value })}
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Chrome Eklentisi
        </h2>
        <button
          onClick={handleGenerateExtensionToken}
          className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
        >
          Yeni eklenti anahtarı üret
        </button>
        {extensionToken ? (
          <div className="rounded border border-amber-600/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <code className="break-all">{extensionToken}</code>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
          Tehlikeli Bölge
        </h2>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="rounded border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-600/10 disabled:opacity-60"
        >
          {isDeleting ? "Siliniyor..." : "Hesabımı ve verilerimi sil"}
        </button>
      </section>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-2">
          {saveMessage ? (
            <span className="mr-auto text-sm text-slate-400">{saveMessage}</span>
          ) : isDirty ? (
            <span className="mr-auto text-sm text-amber-400">Kaydedilmemiş değişiklikler</span>
          ) : null}
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty || isSaving}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

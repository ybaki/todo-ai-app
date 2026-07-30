"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMicrosoftLogin() {
    setIsLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email openid profile offline_access Calendars.ReadBasic",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <h1 className="text-xl font-semibold">Akıllı Todo &amp; Takvim</h1>
        <p className="mt-2 text-sm text-slate-400">
          Devam etmek için şirket Microsoft/Outlook hesabınızla giriş yapın.
        </p>
        <button
          onClick={handleMicrosoftLogin}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {isLoading ? "Yönlendiriliyor..." : "Microsoft ile giriş yap"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <p className="mt-6 text-xs text-slate-500">
          MVP kapsamında yalnızca Microsoft/Outlook girişi desteklenir; free/busy
          bilgisi dışında toplantı içeriği asla saklanmaz.
        </p>
        <Link href="/privacy" className="mt-2 block text-xs text-slate-500 underline">
          Gizlilik politikası
        </Link>
      </div>
    </main>
  );
}

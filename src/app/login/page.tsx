"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  gmail_only: "Bu e-posta adresi ile giriş yapılamaz. @gmail.com veya izin verilen domain kullanın.",
  oauth_failed: "Giriş başarısız oldu. Lütfen tekrar deneyin.",
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError) {
      setError(ERROR_MESSAGES[urlError] ?? "Giriş yapılamadı.");
    }
  }, []);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
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
          Devam etmek için Google hesabınızla giriş yapın. Kabul edilen adresler:{" "}
          <strong className="font-medium text-slate-300">@gmail.com</strong> ve izin
          verilen özel domainler (ör. @yigitbaki.com).
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {isLoading ? "Yönlendiriliyor..." : "Google ile giriş yap"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <p className="mt-6 text-xs text-slate-500">
          Outlook / Microsoft entegrasyonu bu sürümde devre dışıdır. Takvim yalnızca uygulama
          içi plan bloklarını gösterir.
        </p>
        <Link href="/privacy" className="mt-2 block text-xs text-slate-500 underline">
          Gizlilik politikası
        </Link>
      </div>
    </main>
  );
}

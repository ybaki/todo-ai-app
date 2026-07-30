"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
          <p className="mt-2 text-sm text-slate-400">
            Hata otomatik olarak raporlandı. Sayfayı yenilemeyi deneyin.
          </p>
        </div>
      </body>
    </html>
  );
}

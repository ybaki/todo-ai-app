import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN bos ise SDK olay gondermez; gizli bir deger degildir,
// istemciye acik sekilde gomulmesi guvenlidir (Sentry DSN'leri public kabul edilir).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

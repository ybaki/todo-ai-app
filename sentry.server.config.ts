import * as Sentry from "@sentry/nextjs";

// DSN bos birakilirsa Sentry SDK sessizce devre disi kalir (event gondermez).
// Bkz. docs/deployment-runbook.md "Monitoring" bolumu.
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});

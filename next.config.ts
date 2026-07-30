import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// SENTRY_AUTH_TOKEN yoksa (yerel gelistirme / henuz kurulmamis Sentry
// projesi) kaynak haritasi yukleme adimini atlayip duz next.config'i
// disa aktariyoruz; boylece Sentry kurulmamisken build kirilmiyor.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;

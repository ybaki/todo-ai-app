#!/usr/bin/env node
// FAZ 0 dogrulama scripti: kendi Entra App Registration'iniz ile tam OAuth
// authorization code + PKCE akisini calistirir ve Microsoft Graph
// getSchedule cagrisini test eder. Bkz. docs/entra-app-registration.md.
//
// Bagimsiz calisir; yalnizca Node.js >=18 built-in modullerini kullanir.

import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=");
  }
  return env;
}

const env = { ...loadEnvFile(join(__dirname, ".env")), ...process.env };

const CLIENT_ID = env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = env.MICROSOFT_CLIENT_SECRET;
const TENANT_ID = env.MICROSOFT_TENANT_ID || "organizations";
const USER_EMAIL = env.USER_EMAIL;
const REDIRECT_URI = env.REDIRECT_URI || "http://localhost:3000/api/calendar/callback";
const PORT = Number(env.PORT || 3000);
const SCOPES = "offline_access Calendars.ReadBasic";

if (!CLIENT_ID || !CLIENT_SECRET || !USER_EMAIL) {
  console.error(
    "Eksik ayar: scripts/entra-poc/.env icinde MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET ve USER_EMAIL dolu olmali."
  );
  process.exit(1);
}

function base64UrlEncode(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const codeVerifier = base64UrlEncode(randomBytes(32));
const codeChallenge = base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
const state = base64UrlEncode(randomBytes(16));

const authority = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;
const authorizeUrl = new URL(`${authority}/authorize`);
authorizeUrl.searchParams.set("client_id", CLIENT_ID);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authorizeUrl.searchParams.set("response_mode", "query");
authorizeUrl.searchParams.set("scope", SCOPES);
authorizeUrl.searchParams.set("state", state);
authorizeUrl.searchParams.set("code_challenge", codeChallenge);
authorizeUrl.searchParams.set("code_challenge_method", "S256");

console.log("\n1) Asagidaki URL'yi tarayicida acin ve Microsoft hesabinizla giris yapin:\n");
console.log(authorizeUrl.toString());
console.log("\n2) Bu terminal, yerel callback'i bekliyor...\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    res.end(`Hata: ${errorParam} - ${errorDescription}. Terminale donun.`);
    console.error(`\nOAuth hatasi: ${errorParam}\n${errorDescription}\n`);
    if (errorDescription?.includes("AADSTS65001") || errorDescription?.includes("consent")) {
      console.error(
        "-> Bu, tenant admin onayi gerektigi anlamina gelebilir. docs/entra-app-registration.md bolum 4'e bakin."
      );
    }
    server.close();
    return;
  }

  if (!code || returnedState !== state) {
    res.end("Beklenmeyen yanit; terminale donun.");
    return;
  }

  res.end("Giris basarili! Terminale donebilirsiniz.");
  server.close();

  try {
    const tokenResponse = await fetch(`${authority}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        scope: SCOPES,
      }),
    });

    const tokenJson = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("\nToken degisimi basarisiz:\n", JSON.stringify(tokenJson, null, 2));
      process.exit(1);
    }

    console.log("\n3) Token alindi, getSchedule cagriliyor...\n");

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const scheduleResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: [USER_EMAIL],
          startTime: { dateTime: now.toISOString(), timeZone: "UTC" },
          endTime: { dateTime: in7Days.toISOString(), timeZone: "UTC" },
          availabilityViewInterval: 30,
        }),
      }
    );

    const scheduleJson = await scheduleResponse.json();

    if (!scheduleResponse.ok) {
      console.error("\ngetSchedule basarisiz:\n", JSON.stringify(scheduleJson, null, 2));
      process.exit(1);
    }

    console.log("\n✅ BASARILI: getSchedule yaniti alindi.\n");
    console.log(JSON.stringify(scheduleJson, null, 2));
    console.log(
      "\nFAZ 0 cikis kriteri saglandi: kendi client ID'nizle free/busy verisi alinabiliyor.\n"
    );
    process.exit(0);
  } catch (error) {
    console.error("\nBeklenmeyen hata:\n", error);
    process.exit(1);
  }
});

server.listen(PORT);

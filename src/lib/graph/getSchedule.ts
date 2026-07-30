export interface BusyInterval {
  startAt: string;
  endAt: string;
  status: "busy" | "tentative" | "oof";
}

interface GraphScheduleItem {
  status: "free" | "tentative" | "busy" | "oof" | "workingElsewhere";
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

interface GraphGetScheduleResponseItem {
  scheduleId: string;
  scheduleItems?: GraphScheduleItem[];
  error?: { message: string };
}

const RETRYABLE_STATUS = new Set([429, 503]);

/**
 * Microsoft Graph getSchedule ile free/busy bilgisini alir.
 * Yalnizca baslangic/bitis/durum donduruluz; toplanti basligi, aciklamasi
 * veya katilimci bilgisi ISTENMEZ (en dusuk yetki: Calendars.ReadBasic).
 * Bkz. dokuman bolum 8, [R4].
 */
export async function fetchBusySchedule(params: {
  accessToken: string;
  userEmail: string;
  startIso: string;
  endIso: string;
  timezone: string;
  intervalMinutes?: number;
}): Promise<BusyInterval[]> {
  const { accessToken, userEmail, startIso, endIso, timezone, intervalMinutes = 30 } = params;

  const body = {
    schedules: [userEmail],
    startTime: { dateTime: startIso, timeZone: timezone },
    endTime: { dateTime: endIso, timeZone: timezone },
    availabilityViewInterval: intervalMinutes,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: `outlook.timezone="${timezone}"`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (RETRYABLE_STATUS.has(response.status)) {
      const retryAfterSeconds = Number(response.headers.get("Retry-After") ?? "5");
      throw new GraphRetryableError(response.status, retryAfterSeconds);
    }
    throw new Error(`Graph getSchedule basarisiz: ${response.status}`);
  }

  const data = (await response.json()) as { value: GraphGetScheduleResponseItem[] };
  const scheduleItems = data.value?.[0]?.scheduleItems ?? [];

  return scheduleItems
    .filter((item) => item.status === "busy" || item.status === "tentative" || item.status === "oof")
    .map((item) => ({
      startAt: item.start.dateTime,
      endAt: item.end.dateTime,
      status: item.status as BusyInterval["status"],
    }));
}

export class GraphRetryableError extends Error {
  constructor(public statusCode: number, public retryAfterSeconds: number) {
    super(`Graph gecici hata (HTTP ${statusCode}); ${retryAfterSeconds}s sonra tekrar denenmeli`);
    this.name = "GraphRetryableError";
  }
}

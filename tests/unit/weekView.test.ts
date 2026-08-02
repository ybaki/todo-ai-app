import { describe, expect, it } from "vitest";
import {
  blockBelongsToDay,
  buildRangeFromRows,
  formatRowRangeLabel,
  CALENDAR_SLOT_HEIGHT_PX,
  getBlockPlacement,
  getCalendarHours,
  getCalendarSlotIndexes,
  getDayHeaderLabel,
  getNowIndicatorTopPx,
  getPreviewPlacement,
  getWeekDaysFromToday,
  rowIndexFromPointer,
  selectionOverlapsManualBlocks,
  shiftCalendarAnchor,
  slotIndexToMinutes,
} from "@/lib/calendar/weekView";

describe("weekView", () => {
  it("24 saat icin 48 adet 30 dk slot uretir", () => {
    expect(getCalendarSlotIndexes()).toHaveLength(48);
    expect(getCalendarHours()).toHaveLength(24);
  });

  it("gun basligini kisa gun adi olarak dondurur", () => {
    const day = new Date("2026-08-01T12:00:00+03:00");
    expect(getDayHeaderLabel(day).length).toBeGreaterThan(0);
  });

  it("takvim anchorini hafta ay yil kaydirir", () => {
    const anchor = new Date("2026-08-01T12:00:00+03:00");
    expect(shiftCalendarAnchor(anchor, "week", 1).getDate()).toBe(8);
    expect(shiftCalendarAnchor(anchor, "month", 1).getMonth()).toBe(8);
    expect(shiftCalendarAnchor(anchor, "year", 1).getFullYear()).toBe(2027);
  });

  it("30 dk slot araligi uretir", () => {
    const day = new Date("2026-08-01T12:00:00+03:00");
    const range = buildRangeFromRows(day, 28, 29);
    expect(formatRowRangeLabel(28, 29)).toBe("14:00 – 15:00");
    const durationMinutes =
      (new Date(range.endAt).getTime() - new Date(range.startAt).getTime()) / (60 * 1000);
    expect(durationMinutes).toBe(60);
  });

  it("blok konumunu gece yarisindan itibaren hesaplar", () => {
    const placement = getBlockPlacement(
      "2026-08-01T10:30:00+03:00",
      "2026-08-01T11:00:00+03:00"
    );
    expect(placement.topPx).toBeGreaterThan(0);
    expect(placement.heightPx).toBeGreaterThan(0);
  });

  it("simdi cizgisi konumunu hesaplar", () => {
    const top = getNowIndicatorTopPx(new Date("2026-08-01T10:30:00+03:00"));
    expect(top).toBeGreaterThan(0);
  });

  it("blok ayni gune ait mi kontrol eder", () => {
    const day = new Date("2026-08-01T00:00:00+03:00");
    expect(blockBelongsToDay("2026-08-01T15:00:00+03:00", day)).toBe(true);
    expect(blockBelongsToDay("2026-08-02T15:00:00+03:00", day)).toBe(false);
  });

  it("onizleme yuksekligini hesaplar", () => {
    const preview = getPreviewPlacement(2, 5);
    expect(preview.heightPx).toBe(4 * CALENDAR_SLOT_HEIGHT_PX);
  });

  it("cakisan araliklari tespit eder", () => {
    const day = new Date("2026-08-01T12:00:00+03:00");
    const blocks = [
      {
        start_at: "2026-08-01T10:00:00+03:00",
        end_at: "2026-08-01T12:00:00+03:00",
      },
    ];
    expect(selectionOverlapsManualBlocks(day, 20, 22, blocks)).toBe(true);
    expect(selectionOverlapsManualBlocks(day, 26, 28, blocks)).toBe(false);
  });

  it("pointer konumundan satir hesaplar", () => {
    expect(rowIndexFromPointer(100, 100 + CALENDAR_SLOT_HEIGHT_PX * 7 + 5)).toBe(7);
  });
});

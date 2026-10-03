import { describe, expect, it } from "vitest";
import {
  beginEpisode,
  csvExport,
  emptyJournal,
  endEpisode,
  localDate,
  mergeRestore,
  previewRestore,
  saveDay,
  saveEpisode,
  shiftDate,
  summarize,
  unknownTime,
  validateJournal,
  type Episode,
  type Journal,
} from "../src";
const epoch = Date.parse("2026-10-03T04:00:00Z");
const clock = { now: () => epoch, timeZone: () => "Asia/Seoul" };
const ids = { next: () => "episode-1" };
const sample = (): Episode =>
  beginEpisode(emptyJournal(), clock, ids).episodes[0];
describe("symptom records and time", () => {
  it("saves the start before details and refuses a second active episode", () => {
    const j = beginEpisode(emptyJournal(), clock, ids);
    expect(j.episodes[0].start.value).toBe(epoch);
    expect(() => beginEpisode(j, clock, ids)).toThrow("ALREADY_ACTIVE");
    expect(endEpisode(j, "episode-1", epoch + 60000).episodes[0].active).toBe(
      false,
    );
  });
  it("preserves unknown values and does not turn an episode into a daily check-in", () => {
    const e = { ...sample(), active: false, start: unknownTime() };
    const j = saveEpisode(emptyJournal(), e);
    expect(summarize(j, "2026-10-01", "2026-10-03", epoch)).toMatchObject({
      episodeCount: 1,
      recordedDays: 0,
      missingDays: 3,
      meanMinutes: null,
      unknownCount: 1,
    });
  });
  it("requires explicit symptom-free confirmation", () => {
    const j = saveDay(emptyJournal(), "2026-10-03", "none", epoch, "day-1");
    expect(summarize(j, "2026-10-01", "2026-10-03", epoch)).toMatchObject({
      noSymptomDays: 1,
      missingDays: 2,
    });
    expect(
      saveDay(j, "2026-10-03", "symptoms", epoch + 1, "unused").days,
    ).toHaveLength(1);
  });
  it("does not mix approximate and unknown durations into the exact average", () => {
    const e = {
      ...sample(),
      active: false,
      end: { value: epoch + 120000, accuracy: "exact" as const },
    };
    const approximate = {
      ...e,
      id: "approx",
      start: { ...e.start, accuracy: "approximate" as const },
      end: { ...e.end, value: epoch + 3600000 },
    };
    const missing = { ...e, id: "missing", end: unknownTime() };
    const j = { ...emptyJournal(), episodes: [e, approximate, missing] };
    expect(summarize(j, "2026-10-03", "2026-10-03", epoch)).toMatchObject({
      meanMinutes: 2,
      exactCount: 1,
      approximateCount: 1,
      unknownCount: 1,
    });
  });
  it("counts an episode spanning a period once and marks the boundary", () => {
    const e = {
      ...sample(),
      active: false,
      date: "2026-09-30",
      start: {
        value: Date.parse("2026-09-30T14:30Z"),
        accuracy: "exact" as const,
      },
      end: {
        value: Date.parse("2026-10-01T00:30Z"),
        accuracy: "exact" as const,
      },
    };
    const result = summarize(
      { ...emptyJournal(), episodes: [e] },
      "2026-10-01",
      "2026-10-01",
      epoch,
    );
    expect(result.episodeCount).toBe(1);
    expect(result.episodes[0].crossesBoundary).toBe(true);
    expect(result.meanMinutes).toBe(600);
  });
  it("uses the occurrence time zone rather than the current device zone", () => {
    expect(
      localDate(Date.parse("2026-10-01T00:30Z"), "America/Los_Angeles"),
    ).toBe("2026-09-30");
    expect(localDate(Date.parse("2026-10-01T00:30Z"), "Asia/Seoul")).toBe(
      "2026-10-01",
    );
  });
  it("calculates elapsed time across the repeated daylight saving hour", () => {
    const start = Date.parse("2026-11-01T01:30:00-04:00"),
      end = Date.parse("2026-11-01T01:30:00-05:00");
    const e = {
      ...sample(),
      date: "2026-11-01",
      timeZone: "America/New_York",
      active: false,
      start: { value: start, accuracy: "exact" as const },
      end: { value: end, accuracy: "exact" as const },
    };
    validateJournal({ ...emptyJournal(), episodes: [e] });
    expect(
      summarize(
        { ...emptyJournal(), episodes: [e] },
        "2026-11-01",
        "2026-11-01",
        end,
      ).meanMinutes,
    ).toBe(60);
  });
  it.each(["2026-02-30", "2026-13-01", "bad"])(
    "rejects invalid date %s",
    (date) => {
      expect(() =>
        summarize(emptyJournal(), date, "2026-10-03", epoch),
      ).toThrow();
    },
  );
  it("shifts calendar days correctly across month and leap boundaries", () => {
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
  });
  it("rejects impossible time order and known time with unknown accuracy", () => {
    expect(() =>
      saveEpisode(emptyJournal(), {
        ...sample(),
        active: false,
        end: { value: epoch - 1, accuracy: "exact" },
      }),
    ).toThrow();
    expect(() =>
      saveEpisode(emptyJournal(), {
        ...sample(),
        start: { value: epoch, accuracy: "unknown" },
      }),
    ).toThrow();
  });
});
describe("safe restoration", () => {
  it("deduplicates identical records, keeps conflicts by default and replaces only the selected record", () => {
    const current = saveEpisode(emptyJournal(), { ...sample(), active: false });
    const incoming = saveEpisode(emptyJournal(), {
      ...sample(),
      active: false,
      note: "changed",
    });
    expect(previewRestore(current, current)).toMatchObject({
      newCount: 0,
      identicalCount: 1,
      conflicts: [],
    });
    expect(previewRestore(current, incoming).conflicts).toEqual([
      "episodes:episode-1",
    ]);
    expect(mergeRestore(current, incoming, []).episodes[0].note).toBe("");
    expect(
      mergeRestore(current, incoming, ["episodes:episode-1"]).episodes[0].note,
    ).toBe("changed");
  });
  it("detects daily conflicts even when IDs differ", () => {
    const current = saveDay(emptyJournal(), "2026-10-03", "none", epoch, "a");
    const incoming = saveDay(
      emptyJournal(),
      "2026-10-03",
      "symptoms",
      epoch,
      "b",
    );
    expect(previewRestore(current, incoming).conflicts).toEqual(["days:b"]);
    expect(mergeRestore(current, incoming, ["days:b"]).days).toHaveLength(1);
  });
  it("rejects two active episodes and preserves the original object", () => {
    const current = beginEpisode(emptyJournal(), clock, ids);
    const incoming = beginEpisode(emptyJournal(), clock, {
      next: () => "second",
    });
    expect(() => mergeRestore(current, incoming, [])).toThrow();
    expect(current.episodes).toHaveLength(1);
  });
  it("does not restore device contact and permission preferences", () => {
    const incoming = emptyJournal();
    incoming.settings.contactPhone = "private";
    incoming.settings.reminder.enabled = true;
    const current = emptyJournal("ko");
    expect(mergeRestore(current, incoming, []).settings).toEqual(
      current.settings,
    );
  });
  it.each([
    null,
    {},
    { schemaVersion: 2 },
    { ...emptyJournal(), episodes: [{}] },
  ])("rejects damaged or unsupported payloads", (input) =>
    expect(() => validateJournal(input)).toThrow(),
  );
  it("rejects a broken habit reference", () => {
    const j: Journal = {
      ...emptyJournal(),
      habitLogs: [
        {
          id: "l",
          createdAt: epoch,
          updatedAt: epoch,
          date: "2026-10-03",
          habitId: "absent",
          kind: "sleep",
          title: "Sleep",
          outcome: "done",
          sleepHours: 8,
          stress: null,
          note: "",
        },
      ],
    };
    expect(() => validateJournal(j)).toThrow();
  });
  it("rejects duplicate global identifiers and invalid reminder fields", () => {
    const j = beginEpisode(emptyJournal(), clock, ids);
    j.days.push({
      id: "episode-1",
      createdAt: epoch,
      updatedAt: epoch,
      date: "2026-10-03",
      status: "none",
    });
    expect(() => validateJournal(j)).toThrow();
    const bad = emptyJournal();
    bad.settings.reminder.minute = 60;
    expect(() => validateJournal(bad)).toThrow();
  });
});
describe("original export", () => {
  it("keeps multilingual notes, unknown times and CSV escaping", () => {
    const e = {
      ...sample(),
      active: false,
      note: '한글, English "quoted"\nnext',
    };
    const csv = csvExport({ ...emptyJournal(), episodes: [e] });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("한글, English");
    expect(csv).toContain('""');
    expect(csv).toContain("unknown");
  });
  it("guards spreadsheet formulas in record identifiers", () => {
    const csv = csvExport({
      ...emptyJournal(),
      episodes: [{ ...sample(), id: '=HYPERLINK("x")', active: false }],
    });
    expect(csv).toContain("\"'=HYPERLINK");
  });
});

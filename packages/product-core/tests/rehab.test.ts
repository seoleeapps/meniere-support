import { expect, it } from "vitest";
import {
  advanceProgram,
  beginEpisode,
  canStartRehab,
  csvExport,
  emptyJournal,
  mergeRestore,
  migrateJournal,
  nextProgramRound,
  previewRestore,
  startProgram,
  summarize,
  validateJournal,
  type RehabLog,
} from "../src";
const now = Date.parse("2026-10-03T00:00Z");
const log = (): RehabLog => ({
  id: "rehab-1",
  createdAt: now,
  updatedAt: now,
  date: "2026-10-03",
  timeZone: "UTC",
  occurredAt: now,
  kind: "gaze_horizontal",
  plan: "Fictional agreed plan",
  targetSeconds: 15,
  plannedRounds: 2,
  completedRounds: 2,
  durationSeconds: 30,
  before: 3,
  after: 4,
  outcome: "done",
  note: "Fictional session",
});
it("does not start without clinician confirmation or during an acute episode", () => {
  const j = emptyJournal();
  expect(canStartRehab(j, "gaze_horizontal", false)).toBe(false);
  j.rehabPlans = [
    {
      id: "plan-1",
      createdAt: now,
      updatedAt: now,
      kind: "gaze_horizontal",
      instruction: "",
      approved: true,
    },
  ];
  expect(canStartRehab(j, "gaze_horizontal", false)).toBe(true);
  expect(canStartRehab(j, "gaze_horizontal", true)).toBe(false);
  expect(
    canStartRehab(
      beginEpisode(
        j,
        { now: () => now, timeZone: () => "UTC" },
        { next: () => "attack" },
      ),
      "gaze_horizontal",
      false,
    ),
  ).toBe(false);
});
it("a delayed timer stops at the round boundary and never advances through rest", () => {
  let p = advanceProgram(startProgram(15, 2), 100);
  expect(p).toMatchObject({
    phase: "rest",
    elapsedSeconds: 15,
    completedRounds: 1,
  });
  expect(advanceProgram(p, 1000)).toEqual(p);
  p = advanceProgram(nextProgramRound(p), 15);
  expect(p).toMatchObject({
    phase: "complete",
    elapsedSeconds: 30,
    completedRounds: 2,
  });
  expect(advanceProgram(p, 1000)).toEqual(p);
});
it("pause excludes time outside the exercise and resuming retains the remainder", () => {
  const p = {
    ...advanceProgram(startProgram(30, 1), 7),
    phase: "paused" as const,
  };
  expect(advanceProgram(p, 3600)).toEqual(p);
  expect(advanceProgram({ ...p, phase: "exercise" }, 23)).toMatchObject({
    phase: "complete",
    elapsedSeconds: 30,
  });
});
it("rejects invalid parameters and impossible completed sessions", () => {
  expect(() => startProgram(0, 1)).toThrow();
  expect(() => startProgram(30, 6)).toThrow();
  expect(() => startProgram(NaN, 1)).toThrow();
  const j = {
    ...emptyJournal(),
    rehabLogs: [{ ...log(), durationSeconds: 1 }],
  };
  expect(() => validateJournal(j)).toThrow();
  expect(() =>
    validateJournal({ ...j, rehabLogs: [{ ...log(), after: 11 }] }),
  ).toThrow();
  expect(() =>
    validateJournal({ ...j, rehabLogs: [{ ...log(), date: "2026-10-02" }] }),
  ).toThrow();
});
it("upgrades old records once without changing them or inventing exercise data", () => {
  const j = beginEpisode(
    emptyJournal("ko"),
    { now: () => now, timeZone: () => "UTC" },
    { next: () => "attack" },
  );
  const { rehabPlans, rehabLogs, ...rest } = j;
  const old = { ...rest, schemaVersion: 1 };
  const upgraded = migrateJournal(old);
  expect(upgraded.schemaVersion).toBe(2);
  expect(upgraded.episodes).toEqual(j.episodes);
  expect(upgraded.settings).toEqual(j.settings);
  expect(upgraded.rehabLogs).toEqual([]);
  expect(old.schemaVersion).toBe(1);
  expect(migrateJournal(upgraded)).toBe(upgraded);
  expect(() => migrateJournal({ ...old, episodes: null })).toThrow();
  expect(() => migrateJournal({ ...old, schemaVersion: 99 })).toThrow();
});
it("exercise backup conflicts preserve the original and sessions appear in selected summaries and CSV", () => {
  const j = { ...emptyJournal(), rehabLogs: [log()] };
  validateJournal(j);
  expect(previewRestore(j, j).identicalCount).toBe(1);
  const incoming = {
    ...j,
    rehabLogs: [{ ...log(), note: "changed", updatedAt: now + 1 }],
  };
  expect(mergeRestore(j, incoming, []).rehabLogs[0].note).toBe(
    "Fictional session",
  );
  expect(
    mergeRestore(j, incoming, ["rehabLogs:rehab-1"]).rehabLogs[0].note,
  ).toBe("changed");
  expect(summarize(j, "2026-10-03", "2026-10-03", now).rehabLogs).toHaveLength(
    1,
  );
  expect(summarize(j, "2026-10-04", "2026-10-04", now).rehabLogs).toHaveLength(
    0,
  );
  expect(csvExport(j)).toContain("rehabLogs");
});

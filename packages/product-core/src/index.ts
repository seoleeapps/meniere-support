export const symptoms = [
  "vertigo",
  "tinnitus",
  "fullness",
  "hearing",
  "nausea",
  "vomiting",
] as const;
export type Symptom = (typeof symptoms)[number];
export type Accuracy = "exact" | "approximate" | "unknown";
export type Ear = "left" | "right" | "both" | "unknown";
export type Impact = "none" | "some" | "major" | "unknown";
export type HabitKind = "sleep" | "rest" | "food" | "plan";
export type Language = "ko" | "en";
export interface TimeValue {
  value: number | null;
  accuracy: Accuracy;
}
export interface Entity {
  id: string;
  createdAt: number;
  updatedAt: number;
}
export interface Episode extends Entity {
  date: string;
  timeZone: string;
  start: TimeValue;
  end: TimeValue;
  recovery: TimeValue;
  symptoms: Symptom[];
  ear: Ear;
  impact: Impact;
  note: string;
  treatment: string;
  active: boolean;
}
export interface Day extends Entity {
  date: string;
  status: "symptoms" | "none";
}
export interface Habit extends Entity {
  kind: HabitKind;
  title: string;
  enabled: boolean;
}
export interface HabitLog extends Entity {
  date: string;
  habitId: string;
  kind: HabitKind;
  title: string;
  outcome: "done" | "partial" | "skipped";
  sleepHours: number | null;
  stress: 1 | 2 | 3 | null;
  note: string;
}
export interface Visit extends Entity {
  date: string;
  questions: string[];
  note: string;
}
export interface Settings {
  onboarded: boolean;
  language: Language;
  theme: "system" | "light" | "dark";
  contactName: string;
  contactPhone: string;
  emergencyPhone: string;
  reminder: { enabled: boolean; hour: number; minute: number; paused: boolean };
}
export interface Journal {
  schemaVersion: 1;
  episodes: Episode[];
  days: Day[];
  habits: Habit[];
  habitLogs: HabitLog[];
  visits: Visit[];
  settings: Settings;
}
export interface ClockPort {
  now(): number;
  timeZone(): string;
}
export interface IdPort {
  next(): string;
}
export interface JournalPort {
  load(): Promise<Journal>;
  save(journal: Journal): Promise<void>;
  erase(): Promise<void>;
}
export interface ReminderPort {
  apply(settings: Settings): Promise<boolean>;
  clear(): Promise<void>;
}
export interface DocumentPort {
  pdf(summary: Summary, language: Language): Promise<string>;
  csv(journal: Journal): Promise<string>;
}
export interface SharePort {
  share(uri: string, mime: string): Promise<void>;
}
export interface BackupPort {
  create(password: string): Promise<string>;
  inspect(uri: string, password: string): Promise<Journal>;
  dispose(): Promise<void>;
}
export interface AdsPort {
  prepare(): Promise<boolean>;
  privacyOptions(): Promise<void>;
}

export function emptyJournal(language: Language = "en"): Journal {
  return {
    schemaVersion: 1,
    episodes: [],
    days: [],
    habits: [],
    habitLogs: [],
    visits: [],
    settings: {
      onboarded: false,
      language,
      theme: "system",
      contactName: "",
      contactPhone: "",
      emergencyPhone: "",
      reminder: { enabled: false, hour: 20, minute: 0, paused: false },
    },
  };
}
export function localDate(epoch: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(epoch);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
export function validDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}
export function shiftDate(date: string, days: number): string {
  if (!validDate(date)) throw new Error("INVALID_DATE");
  return new Date(Date.parse(date) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export const unknownTime = (): TimeValue => ({
  value: null,
  accuracy: "unknown",
});
const stamp = (id: string, now: number): Entity => ({
  id,
  createdAt: now,
  updatedAt: now,
});
export function beginEpisode(
  j: Journal,
  clock: ClockPort,
  ids: IdPort,
): Journal {
  if (j.episodes.some((e) => e.active)) throw new Error("ALREADY_ACTIVE");
  const now = clock.now(),
    zone = clock.timeZone();
  const episode: Episode = {
    ...stamp(ids.next(), now),
    date: localDate(now, zone),
    timeZone: zone,
    start: { value: now, accuracy: "exact" },
    end: unknownTime(),
    recovery: unknownTime(),
    symptoms: [],
    ear: "unknown",
    impact: "unknown",
    note: "",
    treatment: "",
    active: true,
  };
  return { ...j, episodes: [...j.episodes, episode] };
}
export function saveEpisode(j: Journal, episode: Episode): Journal {
  const next = {
    ...j,
    episodes: [...j.episodes.filter((e) => e.id !== episode.id), episode],
  };
  validateJournal(next);
  return next;
}
export function endEpisode(j: Journal, id: string, now: number): Journal {
  const episode = j.episodes.find((e) => e.id === id);
  if (!episode) throw new Error("NOT_FOUND");
  return saveEpisode(j, {
    ...episode,
    active: false,
    end: { value: now, accuracy: "exact" },
    updatedAt: now,
  });
}
export function saveDay(
  j: Journal,
  date: string,
  status: Day["status"],
  now: number,
  id: string,
): Journal {
  const existing = j.days.find((d) => d.date === date);
  const day: Day = {
    ...(existing ?? stamp(id, now)),
    date,
    status,
    updatedAt: now,
  };
  const next = { ...j, days: [...j.days.filter((d) => d.date !== date), day] };
  validateJournal(next);
  return next;
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("INVALID_RECORD");
}
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);
const finiteTime = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= 8640000000000000;
const text = (v: unknown, max = 20000) =>
  typeof v === "string" && v.length <= max;
function checkTime(t: TimeValue) {
  assert(t && oneOf(t.accuracy, ["exact", "approximate", "unknown"]));
  assert(t.accuracy === "unknown" ? t.value === null : finiteTime(t.value));
}
export function validateJournal(input: unknown): asserts input is Journal {
  const j = input as Journal;
  assert(j && j.schemaVersion === 1);
  const collections = [j.episodes, j.days, j.habits, j.habitLogs, j.visits];
  const ids = new Set<string>();
  for (const collection of collections) {
    assert(Array.isArray(collection) && collection.length <= 100000);
    for (const item of collection) {
      assert(
        item && text(item.id, 128) && item.id.length > 0 && !ids.has(item.id),
      );
      ids.add(item.id);
      assert(
        finiteTime(item.createdAt) &&
          finiteTime(item.updatedAt) &&
          item.updatedAt >= item.createdAt,
      );
    }
  }
  assert(j.episodes.filter((e) => e.active).length <= 1);
  for (const e of j.episodes) {
    assert(validDate(e.date) && text(e.timeZone, 100));
    try {
      new Intl.DateTimeFormat("en", { timeZone: e.timeZone });
    } catch {
      throw new Error("INVALID_RECORD");
    }
    [e.start, e.end, e.recovery].forEach(checkTime);
    assert(
      e.start.value === null || localDate(e.start.value, e.timeZone) === e.date,
    );
    assert(
      e.end.value === null ||
        e.start.value === null ||
        e.end.value >= e.start.value,
    );
    assert(
      e.recovery.value === null ||
        e.end.value === null ||
        e.recovery.value >= e.end.value,
    );
    assert(
      e.recovery.value === null ||
        e.start.value === null ||
        e.recovery.value >= e.start.value,
    );
    assert(
      typeof e.active === "boolean" && (!e.active || e.end.value === null),
    );
    assert(
      Array.isArray(e.symptoms) &&
        e.symptoms.length <= symptoms.length &&
        new Set(e.symptoms).size === e.symptoms.length &&
        e.symptoms.every((s) => oneOf(s, symptoms)),
    );
    assert(
      oneOf(e.ear, ["left", "right", "both", "unknown"]) &&
        oneOf(e.impact, ["none", "some", "major", "unknown"]),
    );
    assert(text(e.note) && text(e.treatment));
  }
  assert(new Set(j.days.map((d) => d.date)).size === j.days.length);
  for (const d of j.days)
    assert(validDate(d.date) && oneOf(d.status, ["symptoms", "none"]));
  assert(j.habits.filter((h) => h.enabled).length <= 3);
  for (const h of j.habits)
    assert(
      oneOf(h.kind, ["sleep", "rest", "food", "plan"]) &&
        text(h.title, 200) &&
        typeof h.enabled === "boolean",
    );
  assert(
    new Set(j.habitLogs.map((l) => `${l.date}:${l.habitId}`)).size ===
      j.habitLogs.length,
  );
  for (const l of j.habitLogs) {
    assert(
      validDate(l.date) &&
        j.habits.some((h) => h.id === l.habitId) &&
        oneOf(l.kind, ["sleep", "rest", "food", "plan"]),
    );
    assert(
      text(l.title, 200) &&
        text(l.note) &&
        oneOf(l.outcome, ["done", "partial", "skipped"]),
    );
    assert(
      l.sleepHours === null ||
        (typeof l.sleepHours === "number" &&
          Number.isFinite(l.sleepHours) &&
          l.sleepHours >= 0 &&
          l.sleepHours <= 24),
    );
    assert(l.stress === null || oneOf(l.stress, [1, 2, 3]));
  }
  for (const v of j.visits)
    assert(
      validDate(v.date) &&
        Array.isArray(v.questions) &&
        v.questions.length <= 100 &&
        v.questions.every((q) => text(q, 2000)) &&
        text(v.note),
    );
  const s = j.settings;
  assert(
    s &&
      typeof s.onboarded === "boolean" &&
      oneOf(s.language, ["ko", "en"]) &&
      oneOf(s.theme, ["system", "light", "dark"]),
  );
  assert(
    text(s.contactName, 200) &&
      text(s.contactPhone, 100) &&
      text(s.emergencyPhone, 100),
  );
  assert(
    s.reminder &&
      typeof s.reminder.enabled === "boolean" &&
      typeof s.reminder.paused === "boolean",
  );
  assert(
    Number.isInteger(s.reminder.hour) &&
      s.reminder.hour >= 0 &&
      s.reminder.hour <= 23,
  );
  assert(
    Number.isInteger(s.reminder.minute) &&
      s.reminder.minute >= 0 &&
      s.reminder.minute <= 59,
  );
}

export interface Summary {
  from: string;
  to: string;
  generatedAt: number;
  totalDays: number;
  recordedDays: number;
  missingDays: number;
  symptomDays: number;
  noSymptomDays: number;
  episodeCount: number;
  exactCount: number;
  approximateCount: number;
  unknownCount: number;
  meanMinutes: number | null;
  majorImpactDays: number;
  episodes: (Episode & { crossesBoundary: boolean })[];
  habitLogs: HabitLog[];
  questions: string[];
}
export function summarize(
  j: Journal,
  from: string,
  to: string,
  now: number,
  questions: string[] = [],
): Summary {
  if (!validDate(from) || !validDate(to) || from > to)
    throw new Error("INVALID_RANGE");
  const totalDays =
    Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (totalDays > 3660) throw new Error("INVALID_RANGE");
  const inRange = (date: string) => date >= from && date <= to;
  const days = j.days.filter((d) => inRange(d.date));
  const episodes = j.episodes
    .filter((e) => {
      const endDate =
        e.end.value === null ? e.date : localDate(e.end.value, e.timeZone);
      return e.date <= to && endDate >= from;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.start.value ?? 0) - (b.start.value ?? 0),
    )
    .map((e) => ({
      ...e,
      crossesBoundary:
        e.date < from ||
        (e.end.value !== null && localDate(e.end.value, e.timeZone) > to),
    }));
  const known = episodes.filter(
    (e) => e.start.value !== null && e.end.value !== null,
  );
  const exact = known.filter(
    (e) => e.start.accuracy === "exact" && e.end.accuracy === "exact",
  );
  return {
    from,
    to,
    generatedAt: now,
    totalDays,
    recordedDays: days.length,
    missingDays: totalDays - days.length,
    symptomDays: days.filter((d) => d.status === "symptoms").length,
    noSymptomDays: days.filter((d) => d.status === "none").length,
    episodeCount: episodes.length,
    exactCount: exact.length,
    approximateCount: known.length - exact.length,
    unknownCount: episodes.length - known.length,
    meanMinutes: exact.length
      ? exact.reduce(
          (sum, e) => sum + (e.end.value! - e.start.value!) / 60000,
          0,
        ) / exact.length
      : null,
    majorImpactDays: new Set(
      episodes.filter((e) => e.impact === "major").map((e) => e.date),
    ).size,
    episodes,
    habitLogs: j.habitLogs.filter((l) => inRange(l.date)),
    questions,
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
type Collection = "episodes" | "days" | "habits" | "habitLogs" | "visits";
const collectionNames: Collection[] = [
  "episodes",
  "days",
  "habits",
  "habitLogs",
  "visits",
];
export interface RestorePreview {
  newCount: number;
  identicalCount: number;
  conflicts: string[];
  from: string | null;
  to: string | null;
}
function logicalKey(collection: Collection, entity: Entity): string {
  if (collection === "days") return (entity as Day).date;
  if (collection === "habitLogs") {
    const l = entity as HabitLog;
    return `${l.date}:${l.habitId}`;
  }
  return entity.id;
}
export function previewRestore(
  current: Journal,
  incoming: Journal,
): RestorePreview {
  validateJournal(incoming);
  const result: RestorePreview = {
    newCount: 0,
    identicalCount: 0,
    conflicts: [],
    from: null,
    to: null,
  };
  for (const collection of collectionNames)
    for (const item of incoming[collection]) {
      const existing = (current[collection] as Entity[]).find(
        (e) =>
          e.id === item.id ||
          logicalKey(collection, e) === logicalKey(collection, item),
      );
      if (!existing) result.newCount++;
      else if (canonical(existing) === canonical(item)) result.identicalCount++;
      else result.conflicts.push(`${collection}:${item.id}`);
    }
  const dates = [
    ...incoming.episodes,
    ...incoming.days,
    ...incoming.habitLogs,
    ...incoming.visits,
  ]
    .map((e) => e.date)
    .sort();
  result.from = dates[0] ?? null;
  result.to = dates.at(-1) ?? null;
  return result;
}
export function mergeRestore(
  current: Journal,
  incoming: Journal,
  replace: readonly string[],
): Journal {
  previewRestore(current, incoming);
  const next = { ...current };
  for (const collection of collectionNames) {
    const rows: Entity[] = [...current[collection]];
    for (const item of incoming[collection]) {
      const index = rows.findIndex(
        (e) =>
          e.id === item.id ||
          logicalKey(collection, e) === logicalKey(collection, item),
      );
      if (index < 0) rows.push(item);
      else if (replace.includes(`${collection}:${item.id}`)) rows[index] = item;
    }
    Object.assign(next, { [collection]: rows });
  }
  // Device preferences, contact details and reminder permissions remain on this device.
  validateJournal(next);
  return next;
}
export function csvExport(j: Journal): string {
  const cell = (v: unknown) => {
    const raw = String(v ?? "");
    const safe =
      /^[\s]*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows: unknown[][] = [["type", "id", "date", "data_json"]];
  for (const collection of collectionNames)
    for (const e of j[collection])
      rows.push([
        collection,
        e.id,
        "date" in e ? e.date : "",
        JSON.stringify(e),
      ]);
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

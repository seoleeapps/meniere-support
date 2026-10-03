import type {
  Accuracy,
  Ear,
  HabitKind,
  Impact,
  Language,
  Symptom,
  TimeValue,
} from "@meniere/product-core";
export type Translate = (ko: string, en: string) => string;
export const translator =
  (language: Language): Translate =>
  (ko, en) =>
    language === "ko" ? ko : en;
export const symptomName = (s: Symptom, t: Translate) =>
  ({
    vertigo: t("어지럼", "Vertigo"),
    tinnitus: t("이명", "Tinnitus"),
    fullness: t("귀 먹먹함", "Ear fullness"),
    hearing: t("청력 변화 느낌", "Perceived hearing change"),
    nausea: t("구역", "Nausea"),
    vomiting: t("구토", "Vomiting"),
  })[s];
export const accuracyName = (a: Accuracy, t: Translate) =>
  ({
    exact: t("정확함", "Exact"),
    approximate: t("대략", "Approximate"),
    unknown: t("모름", "Unknown"),
  })[a];
export const earName = (e: Ear, t: Translate) =>
  ({
    left: t("왼쪽", "Left"),
    right: t("오른쪽", "Right"),
    both: t("양쪽", "Both"),
    unknown: t("모름", "Unknown"),
  })[e];
export const impactName = (i: Impact, t: Translate) =>
  ({
    none: t("지장 없음", "No disruption"),
    some: t("일부 활동 중단", "Some disruption"),
    major: t("일상 크게 중단", "Major disruption"),
    unknown: t("모름", "Unknown"),
  })[i];
export const habitName = (h: HabitKind, t: Translate) =>
  ({
    sleep: t("수면", "Sleep"),
    rest: t("스트레스와 휴식", "Stress & rest"),
    food: t("식사와 음료", "Food & drinks"),
    plan: t("의료진과 정한 계획", "Plan agreed with clinician"),
  })[h];
export function timeName(
  time: TimeValue,
  zone: string,
  language: Language,
): string {
  const t = translator(language);
  if (time.value === null) return t("미확정", "Unknown");
  return (
    (time.accuracy === "approximate" ? t("대략 ", "About ") : "") +
    new Intl.DateTimeFormat(language, {
      timeZone: zone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(time.value)
  );
}

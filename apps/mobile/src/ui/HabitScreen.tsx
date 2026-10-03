import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  localDate,
  shiftDate,
  type HabitKind,
  type HabitLog,
} from "@meniere/product-core";
import { clock, ids } from "../adapters/storage";
import { Button, Card, Choices, Copy, Field, Heading } from "./components";
import { habitName, translator } from "./labels";
import type { ScreenProps } from "./screen-types";
export function HabitScreen({
  journal: j,
  busy,
  commit,
  onEditingChange,
}: ScreenProps) {
  const t = translator(j.settings.language),
    today = localDate(clock.now(), clock.timeZone());
  const [sleepText, setSleepText] = useState("");
  const [editing, setEditing] = useState<HabitLog | null>(null),
    [date, setDate] = useState(today),
    [plan, setPlan] = useState(
      j.habits.find((h) => h.kind === "plan")?.title ?? "",
    );
  useEffect(() => {
    setSleepText(
      editing?.sleepHours === null || editing?.sleepHours === undefined
        ? ""
        : String(editing.sleepHours),
    );
  }, [editing?.id]);
  useEffect(() => {
    onEditingChange(Boolean(editing));
    return () => onEditingChange(false);
  }, [Boolean(editing), onEditingChange]);
  const toggle = async (kind: HabitKind) => {
    const existing = j.habits.find((h) => h.kind === kind),
      now = clock.now();
    if (!existing?.enabled && j.habits.filter((h) => h.enabled).length >= 3) {
      Alert.alert(
        t("최대 3개", "Choose up to 3"),
        t(
          "챙길 항목을 1~3개만 선택해 주세요.",
          "Select 1–3 habits that matter to you.",
        ),
      );
      return;
    }
    const habit = existing
      ? { ...existing, enabled: !existing.enabled, updatedAt: now }
      : {
          id: `habit-${kind}`,
          createdAt: now,
          updatedAt: now,
          kind,
          title:
            kind === "plan" ? plan || habitName(kind, t) : habitName(kind, t),
          enabled: true,
        };
    await commit({
      ...j,
      habits: [...j.habits.filter((h) => h.id !== habit.id), habit],
    });
  };
  if (editing)
    return (
      <>
        <Button
          secondary
          label={t("돌아가기", "Back")}
          onPress={() => setEditing(null)}
        />
        <Heading>{editing.title}</Heading>
        <Copy>{editing.date}</Copy>
        <Choices
          label={t("오늘의 확인", "Daily check-in")}
          values={["done", "partial", "skipped"] as const}
          selected={[editing.outcome]}
          name={(v) =>
            ({
              done: t("실천함", "Done"),
              partial: t("일부", "Partly"),
              skipped: t("건너뜀", "Skipped"),
            })[v]
          }
          onChange={(outcome) => setEditing({ ...editing, outcome })}
        />
        {editing.kind === "sleep" && (
          <Field
            label={t(
              "대략적인 수면 시간 · 0~24",
              "Approximate sleep hours · 0–24",
            )}
            keyboardType="decimal-pad"
            value={sleepText}
            onChangeText={setSleepText}
          />
        )}{" "}
        {editing.kind === "rest" && (
          <Choices<"unknown" | "1" | "2" | "3">
            label={t("오늘 느낀 부담", "Stress today")}
            values={["unknown", "1", "2", "3"] as const}
            selected={[
              editing.stress === null
                ? "unknown"
                : (String(editing.stress) as "1" | "2" | "3"),
            ]}
            name={(v) =>
              ({
                unknown: t("미입력", "Not entered"),
                "1": t("낮음", "Low"),
                "2": t("보통", "Moderate"),
                "3": t("높음", "High"),
              })[v]
            }
            onChange={(v) =>
              setEditing({
                ...editing,
                stress: v === "unknown" ? null : (Number(v) as 1 | 2 | 3),
              })
            }
          />
        )}
        <Field
          label={
            editing.kind === "food"
              ? t(
                  "평소와 다른 식사·카페인·음주 메모",
                  "Food changes, caffeine or alcohol notes",
                )
              : t("메모 · 선택 사항", "Notes · optional")
          }
          multiline
          value={editing.note}
          onChangeText={(note) => setEditing({ ...editing, note })}
        />
        <Button
          label={t("저장", "Save")}
          disabled={busy}
          onPress={async () => {
            if (
              await commit({
                ...j,
                habitLogs: [
                  ...j.habitLogs.filter(
                    (l) =>
                      !(
                        l.habitId === editing.habitId && l.date === editing.date
                      ),
                  ),
                  {
                    ...editing,
                    sleepHours:
                      editing.kind === "sleep"
                        ? sleepText.trim() === ""
                          ? null
                          : Number(sleepText.replace(",", "."))
                        : editing.sleepHours,
                    updatedAt: clock.now(),
                  },
                ],
              })
            )
              setEditing(null);
          }}
        />
        {j.habitLogs.some((l) => l.id === editing.id) && (
          <Button
            danger
            secondary
            label={t("확인 기록 삭제", "Delete check-in")}
            disabled={busy}
            onPress={async () => {
              if (
                await commit({
                  ...j,
                  habitLogs: j.habitLogs.filter((l) => l.id !== editing.id),
                })
              )
                setEditing(null);
            }}
          />
        )}
      </>
    );
  const weekFrom = shiftDate(today, -6),
    weekLogs = j.habitLogs.filter((l) => l.date >= weekFrom && l.date <= today);
  return (
    <>
      <Heading>{t("나에게 맞는 생활", "Habits that fit you")}</Heading>
      <Copy muted>
        {t(
          "기록은 평가가 아닙니다. 편한 항목만 골라 주세요.",
          "These records are not a score. Choose what feels useful.",
        )}
      </Copy>
      <Choices
        label={t("챙길 항목 · 최대 3개", "Your habits · up to 3")}
        values={["sleep", "rest", "food", "plan"] as const}
        selected={j.habits.filter((h) => h.enabled).map((h) => h.kind)}
        multiple
        name={(h) => habitName(h, t)}
        onChange={(kind) => {
          if (!busy) void toggle(kind);
        }}
      />
      {j.habits.some((h) => h.kind === "plan" && h.enabled) && (
        <Card>
          <Field
            label={t(
              "의료진과 정한 생활 계획",
              "Your plan agreed with a clinician",
            )}
            value={plan}
            maxLength={200}
            onChangeText={setPlan}
          />
          <Button
            secondary
            label={t("계획 이름 저장", "Save plan title")}
            disabled={busy}
            onPress={() => {
              const habit = j.habits.find((h) => h.kind === "plan")!;
              void commit({
                ...j,
                habits: j.habits.map((h) =>
                  h.id === habit.id
                    ? {
                        ...h,
                        title: plan || habitName("plan", t),
                        updatedAt: clock.now(),
                      }
                    : h,
                ),
              });
            }}
          />
        </Card>
      )}
      <Field
        label={t("확인할 날짜 · YYYY-MM-DD", "Check-in date · YYYY-MM-DD")}
        value={date}
        onChangeText={setDate}
      />
      {j.habits
        .filter((h) => h.enabled)
        .map((h) => (
          <Card key={h.id}>
            <Heading small>
              {h.kind === "plan" ? h.title : habitName(h.kind, t)}
            </Heading>
            <Copy>
              {j.habitLogs.some((l) => l.habitId === h.id && l.date === date)
                ? t(
                    "확인을 남겼습니다. 수정할 수 있어요.",
                    "Checked in. You can edit it.",
                  )
                : t("아직 확인하지 않았습니다.", "Not checked in yet.")}
            </Copy>
            <Button
              secondary
              disabled={busy}
              label={t("하루 확인", "Daily check-in")}
              onPress={() => {
                const now = clock.now();
                setEditing(
                  j.habitLogs.find(
                    (l) => l.habitId === h.id && l.date === date,
                  ) ?? {
                    id: ids.next(),
                    createdAt: now,
                    updatedAt: now,
                    date,
                    habitId: h.id,
                    kind: h.kind,
                    title: h.kind === "plan" ? h.title : habitName(h.kind, t),
                    outcome: "done",
                    sleepHours: null,
                    stress: null,
                    note: "",
                  },
                );
              }}
            />
          </Card>
        ))}
      <Card>
        <Heading small>{t("최근 7일 돌아보기", "Past 7 days")}</Heading>
        {j.habits.map((h) => (
          <Copy key={h.id}>
            {h.kind === "plan" ? h.title : habitName(h.kind, t)}:{" "}
            {
              new Set(
                weekLogs.filter((l) => l.habitId === h.id).map((l) => l.date),
              ).size
            }
            {t("일 기록", " days recorded")}
          </Copy>
        ))}
        <Copy>
          {t("발작을 남긴 발생일", "Dates with a recorded episode")}:{" "}
          {
            new Set(
              j.episodes
                .filter((e) => e.date >= weekFrom && e.date <= today)
                .map((e) => e.date),
            ).size
          }
        </Copy>
        <Copy muted>
          {t(
            "함께 나타났다는 사실은 원인을 뜻하지 않습니다.",
            "Appearing together does not show a cause.",
          )}
        </Copy>
        <Button
          secondary
          disabled={busy}
          label={t("다음 진료 질문에 추가", "Add to visit questions")}
          onPress={() => {
            const now = clock.now(),
              visit = j.visits.find((v) => v.date === today),
              question = t(
                "최근 생활 기록과 증상 변화를 진료에서 함께 살펴보고 싶습니다.",
                "I would like to discuss my recent habit records and symptom changes.",
              );
            void commit({
              ...j,
              visits: [
                ...j.visits.filter((v) => v.date !== today),
                visit
                  ? {
                      ...visit,
                      questions: [...visit.questions, question],
                      updatedAt: now,
                    }
                  : {
                      id: ids.next(),
                      createdAt: now,
                      updatedAt: now,
                      date: today,
                      questions: [question],
                      note: "",
                    },
              ],
            });
          }}
        />
      </Card>
      {j.habitLogs.length > 0 && (
        <Card>
          <Heading small>{t("남긴 생활 기록", "Habit record history")}</Heading>
          {[...j.habitLogs]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((l) => (
              <Button
                key={l.id}
                secondary
                disabled={busy}
                label={`${l.date} · ${l.title}`}
                onPress={() => setEditing(l)}
              />
            ))}
        </Card>
      )}
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking } from "react-native";
import {
  advanceProgram,
  canStartRehab,
  localDate,
  nextProgramRound,
  startProgram,
  type ExerciseProgram,
  type RehabKind,
  type RehabLog,
} from "@meniere/product-core";
import { clock, ids } from "../adapters/storage";
import { Button, Card, Choices, Copy, Field, Heading } from "./components";
import { translator } from "./labels";
import {
  rehabName,
  rehabOutcome,
  rehabSources,
  rehabSteps,
} from "./rehab-content";
import { RehabDemo, RestPicture } from "./RehabVisual";
import { RehabStage } from "./RehabStage";
import { View } from "react-native";
import type { ScreenProps } from "./screen-types";
const kinds: RehabKind[] = [
  "gaze_horizontal",
  "gaze_vertical",
  "balance_supported",
];
export function RehabScreen({
  journal: j,
  busy,
  commit,
  onEditingChange,
  onBack,
  onHelp,
  onTargetActive,
  onScrollToTop,
}: ScreenProps & {
  onBack: () => void;
  onHelp: () => void;
  onTargetActive: (active: boolean) => void;
  onScrollToTop: () => void;
}) {
  const t = translator(j.settings.language);
  const [details, setDetails] = useState(false);
  const [leadIn, setLeadIn] = useState<number | null>(null);
  const [kind, setKind] = useState<RehabKind>("gaze_horizontal"),
    [instruction, setInstruction] = useState(""),
    [approved, setApproved] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null),
    [rounds, setRounds] = useState<number | null>(null),
    [safe, setSafe] = useState(false);
  const [before, setBefore] = useState(""),
    [after, setAfter] = useState(""),
    [note, setNote] = useState("");
  const [program, setProgram] = useState<ExerciseProgram | null>(null),
    [record, setRecord] = useState<RehabLog | null>(null),
    [stopping, setStopping] = useState(false);
  const [editing, setEditing] = useState<RehabLog | null>(null);
  const lastTick = useRef(0),
    latest = useRef({ j, commit, program, record }),
    foreground = useRef(AppState.currentState === "active");
  latest.current = { j, commit, program, record };
  useEffect(() => {
    const p = j.rehabPlans.find((p) => p.kind === kind);
    setInstruction(p?.instruction ?? "");
    setApproved(p?.approved ?? false);
    setSafe(false);
  }, [kind]);
  useEffect(() => {
    onEditingChange(Boolean(program || editing));
    return () => onEditingChange(false);
  }, [Boolean(program || editing), onEditingChange]);
  useEffect(() => {
    onTargetActive(
      Boolean(program && !stopping && program.phase !== "complete"),
    );
    return () => onTargetActive(false);
  }, [
    Boolean(program && !stopping && program.phase !== "complete"),
    onTargetActive,
  ]);
  const progress = (p: ExerciseProgram) => {
    const current = latest.current,
      r = current.record;
    if (!r) return;
    void current.commit({
      ...current.j,
      rehabLogs: current.j.rehabLogs.map((l) =>
        l.id === r.id
          ? {
              ...l,
              updatedAt: clock.now(),
              durationSeconds: p.elapsedSeconds,
              completedRounds: p.completedRounds,
            }
          : l,
      ),
    });
  };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      if (state !== "active") {
        setLeadIn(null);
        const p = latest.current.program;
        if (p?.phase === "exercise") {
          const elapsed = Math.max(
            0,
            Math.floor((Date.now() - lastTick.current) / 1000),
          );
          const advanced = advanceProgram(p, elapsed);
          const paused =
            advanced.phase === "exercise"
              ? { ...advanced, phase: "paused" as const }
              : advanced;
          setProgram(paused);
          progress(paused);
        }
      }
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (program?.phase !== "exercise") return;
    lastTick.current = Date.now();
    const timer = setInterval(() => {
      if (!foreground.current) return;
      const now = Date.now(),
        elapsed = Math.floor((now - lastTick.current) / 1000);
      if (elapsed > 0) {
        lastTick.current += elapsed * 1000;
        setProgram((p) => (p ? advanceProgram(p, elapsed) : p));
      }
    }, 200);
    return () => clearInterval(timer);
  }, [program?.phase, program?.completedRounds]);
  useEffect(() => {
    if (program && program.phase !== "exercise") progress(program);
  }, [program?.phase, program?.completedRounds]);
  useEffect(() => {
    if (leadIn === null) return;
    if (leadIn === 0) {
      setLeadIn(null);
      if (foreground.current)
        setProgram((p) => (p ? { ...p, phase: "exercise" } : p));
      return;
    }
    const timer = setTimeout(
      () => setLeadIn((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [leadIn]);
  const pause = () => {
    setLeadIn(null);
    const current = latest.current.program;
    if (!current) return;
    const elapsed =
      current.phase === "exercise"
        ? Math.max(0, Math.floor((Date.now() - lastTick.current) / 1000))
        : 0;
    const advanced = advanceProgram(current, elapsed);
    const paused =
      advanced.phase === "exercise"
        ? { ...advanced, phase: "paused" as const }
        : advanced;
    setProgram(paused);
    progress(paused);
  };
  const rating = (value: string) =>
    value.trim() === "" ? null : Number(value);
  const validRating = (value: string) =>
    value.trim() === "" ||
    (Number.isInteger(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= 10);
  const checkRatings = () => {
    if (validRating(before) && validRating(after)) return true;
    Alert.alert(
      t("입력 확인", "Check your entry"),
      t(
        "불편감은 0~10 또는 빈칸으로 남겨 주세요.",
        "Use 0–10 or leave discomfort blank.",
      ),
    );
    return false;
  };
  const start = async () => {
    if (
      seconds === null ||
      rounds === null ||
      !safe ||
      !canStartRehab(j, kind, false) ||
      !checkRatings()
    )
      return;
    const p = startProgram(seconds, rounds),
      now = clock.now(),
      zone = clock.timeZone();
    const r: RehabLog = {
      id: ids.next(),
      createdAt: now,
      updatedAt: now,
      date: localDate(now, zone),
      timeZone: zone,
      occurredAt: now,
      kind,
      plan: j.rehabPlans.find((p) => p.kind === kind)?.instruction ?? "",
      targetSeconds: seconds,
      plannedRounds: rounds,
      completedRounds: 0,
      durationSeconds: null,
      before: rating(before),
      after: null,
      outcome: "unfinished",
      note: "",
    };
    if (await commit({ ...j, rehabLogs: [...j.rehabLogs, r] })) {
      setRecord(r);
      setProgram({ ...p, phase: "paused" });
      setLeadIn(3);
      setStopping(false);
      setAfter("");
      setNote("");
      requestAnimationFrame(onScrollToTop);
    }
  };
  const finish = async (outcome: "done" | "stopped") => {
    if (!program || !record || !checkRatings()) return;
    const log = {
      ...record,
      updatedAt: clock.now(),
      durationSeconds: program.elapsedSeconds,
      completedRounds: program.completedRounds,
      after: rating(after),
      outcome,
      note,
    };
    if (
      await commit({
        ...j,
        rehabLogs: j.rehabLogs.map((l) => (l.id === record.id ? log : l)),
      })
    ) {
      setProgram(null);
      setRecord(null);
      setSafe(false);
    }
  };
  if (program && record) {
    return (
      <>
        {!stopping && program.phase !== "complete" && (
          <RehabStage
            kind={record.kind}
            program={program}
            leadIn={leadIn}
            busy={busy || !canStartRehab(j, record.kind, false)}
            t={t}
            onPause={pause}
            onContinue={() => {
              setProgram(
                program.phase === "rest"
                  ? { ...nextProgramRound(program), phase: "paused" }
                  : program,
              );
              setLeadIn(3);
            }}
            onStop={() => {
              pause();
              setStopping(true);
            }}
            onHelp={() => {
              pause();
              onHelp();
            }}
          />
        )}
        {(stopping || program.phase === "complete") && (
          <>
            <View style={{ height: 150 }}>
              <RestPicture />
            </View>
            <Heading small>
              {stopping
                ? t("중단한 수행 기록", "Record your stopped session")
                : t(
                    "정한 회차가 끝났어요",
                    "Your selected rounds are complete",
                  )}
            </Heading>
            <Copy>
              {program.elapsedSeconds}{" "}
              {t(
                "초 수행 · 휴식 시간 제외",
                "seconds exercised · rest excluded",
              )}
            </Copy>
            <Field
              label={t(
                "운동 후 불편감 · 0~10, 선택",
                "Discomfort after · 0–10, optional",
              )}
              keyboardType="number-pad"
              value={after}
              onChangeText={setAfter}
              maxLength={2}
            />
            <Field
              label={t("메모 · 선택", "Notes · optional")}
              multiline
              value={note}
              onChangeText={setNote}
            />
            <Button
              disabled={busy}
              label={t("수행 기록 저장", "Save exercise record")}
              onPress={() => void finish(stopping ? "stopped" : "done")}
            />
          </>
        )}
        <Copy muted>
          {t(
            "강한 어지럼·구역, 목 통증, 넘어질 위험이 생기면 중단하고 안전하게 앉으세요. 새롭거나 심한 증상은 도움 화면을 확인하세요.",
            "Stop and sit safely for strong dizziness, nausea, neck pain or a fall risk. For new or severe symptoms, see Help.",
          )}
        </Copy>
      </>
    );
  }
  if (editing)
    return (
      <>
        <Button
          secondary
          disabled={busy}
          label={t("돌아가기", "Back")}
          onPress={() => setEditing(null)}
        />
        <Heading>{rehabName(editing.kind, t)}</Heading>
        <Copy>
          {editing.date} · {rehabOutcome(editing.outcome, t)} ·{" "}
          {editing.durationSeconds ?? "—"} {t("초", "sec")}
        </Copy>
        <Copy>
          {t(
            "완료 여부와 수행 시간은 실제 프로그램 기록입니다. 메모와 불편감을 보완할 수 있습니다.",
            "Outcome and duration reflect the program session. You can update notes and discomfort.",
          )}
        </Copy>
        <Field
          label={t("운동 전 불편감 · 0~10", "Discomfort before · 0–10")}
          keyboardType="number-pad"
          value={before}
          onChangeText={setBefore}
          maxLength={2}
        />
        <Field
          label={t("운동 후 불편감 · 0~10", "Discomfort after · 0–10")}
          keyboardType="number-pad"
          value={after}
          onChangeText={setAfter}
          maxLength={2}
        />
        <Field
          label={t("메모", "Notes")}
          multiline
          value={note}
          onChangeText={setNote}
        />
        <Button
          disabled={busy}
          label={t("기록 보완 저장", "Save record details")}
          onPress={async () => {
            if (
              checkRatings() &&
              (await commit({
                ...j,
                rehabLogs: j.rehabLogs.map((l) =>
                  l.id === editing.id
                    ? {
                        ...l,
                        before: rating(before),
                        after: rating(after),
                        note,
                        updatedAt: clock.now(),
                      }
                    : l,
                ),
              }))
            )
              setEditing(null);
          }}
        />
        <Button
          danger
          secondary
          disabled={busy}
          label={t("수행 기록 삭제", "Delete exercise record")}
          onPress={() =>
            Alert.alert(
              t("수행 기록 삭제", "Delete exercise record"),
              editing.date,
              [
                { text: t("취소", "Cancel"), style: "cancel" },
                {
                  text: t("삭제", "Delete"),
                  style: "destructive",
                  onPress: () =>
                    void commit({
                      ...j,
                      rehabLogs: j.rehabLogs.filter((l) => l.id !== editing.id),
                    }).then((ok) => {
                      if (ok) setEditing(null);
                    }),
                },
              ],
            )
          }
        />
      </>
    );
  return (
    <>
      <Button secondary label={t("돌아가기", "Back")} onPress={onBack} />
      <Heading>{t("전정재활 운동", "Vestibular rehabilitation")}</Heading>
      <Copy>
        {t(
          "동작을 그림으로 익히고, 의료진과 확인한 운동을 화면과 함께 수행하세요. 발작 중에는 쉬세요.",
          "Learn the movement visually, then follow the exercise agreed with your clinician. Rest during an attack.",
        )}
      </Copy>
      {j.episodes.some((e) => e.active) && (
        <Card>
          <Heading small>
            {t("발작 기록이 진행 중입니다", "An episode is in progress")}
          </Heading>
          <Copy>
            {t(
              "발작 중에는 운동을 시작할 수 없습니다. 안전하게 쉬고, 실제로 발작이 끝난 뒤 기록하세요.",
              "Exercise cannot start during an active episode. Rest safely and record its end when it has actually ended.",
            )}
          </Copy>
        </Card>
      )}
      <Choices
        label={t("운동 선택", "Choose an exercise")}
        values={kinds}
        selected={[kind]}
        name={(v) => rehabName(v, t)}
        onChange={(v) => {
          setKind(v);
          setSeconds(null);
          setRounds(null);
        }}
      />
      <Card>
        <Heading small>{rehabName(kind, t)}</Heading>
        <RehabDemo kind={kind} t={t} />
        <Button
          secondary
          label={
            details
              ? t("자세·주의점 접기", "Hide setup & precautions")
              : t("자세·주의점 자세히", "Setup & precautions")
          }
          onPress={() => setDetails(!details)}
        />
        {details && (
          <>
            {rehabSteps(kind, t).map((s, i) => (
              <Copy key={i}>
                {i + 1}. {s}
              </Copy>
            ))}
            <Copy muted>
              {t(
                "발작을 멈추거나 질환을 진단하는 프로그램이 아닙니다. 본인에게 맞는 운동·시간·횟수는 의료진과 먼저 확인하세요.",
                "This program does not stop attacks or diagnose a condition. First agree suitable exercises, duration and repetitions with your clinician.",
              )}
            </Copy>
          </>
        )}
      </Card>
      <Field
        label={t(
          "의료진과 정한 운동 계획 · 시간·횟수·주의점",
          "Agreed exercise plan · time, repetitions, precautions",
        )}
        multiline
        maxLength={2000}
        value={instruction}
        onChangeText={setInstruction}
      />
      <Choices
        label={t(
          "이 운동을 의료진과 확인했나요?",
          "Has your clinician confirmed this exercise?",
        )}
        values={["no", "yes"] as const}
        selected={[approved ? "yes" : "no"]}
        name={(v) =>
          v === "yes"
            ? t("확인했어요", "Confirmed")
            : t("아직이에요", "Not yet")
        }
        onChange={(v) => setApproved(v === "yes")}
      />
      <Button
        secondary
        disabled={busy}
        label={t("운동 계획 저장", "Save exercise plan")}
        onPress={() => {
          const now = clock.now(),
            existing = j.rehabPlans.find((p) => p.kind === kind);
          void commit({
            ...j,
            rehabPlans: [
              ...j.rehabPlans.filter((p) => p.kind !== kind),
              {
                id: existing?.id ?? `rehab-plan-${kind}`,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
                kind,
                instruction,
                approved,
              },
            ],
          });
        }}
      />
      <Choices
        label={t("확인한 회차당 시간", "Agreed time per round")}
        values={["15", "30", "60", "90", "120"]}
        selected={seconds === null ? [] : [String(seconds)]}
        name={(v) => `${v} ${t("초", "sec")}`}
        onChange={(v) => setSeconds(Number(v))}
      />
      <Choices
        label={t("확인한 반복 횟수", "Agreed repetitions")}
        values={["1", "2", "3", "4", "5"]}
        selected={rounds === null ? [] : [String(rounds)]}
        name={(v) => `${v} ${t("회", "rounds")}`}
        onChange={(v) => setRounds(Number(v))}
      />
      <Field
        label={t(
          "운동 전 불편감 · 0~10, 선택",
          "Discomfort before · 0–10, optional",
        )}
        keyboardType="number-pad"
        value={before}
        onChangeText={setBefore}
        maxLength={2}
      />
      <Choices
        label={t(
          "지금 발작이 없고, 안전한 자리와 고정된 거치대·지지물을 준비했나요?",
          "No acute attack now, with a safe space and a fixed holder or support?",
        )}
        values={["no", "yes"] as const}
        selected={[safe ? "yes" : "no"]}
        name={(v) =>
          v === "yes" ? t("준비됐어요", "Ready") : t("아직이에요", "Not yet")
        }
        onChange={(v) => setSafe(v === "yes")}
      />
      <Button
        testID="start-rehab"
        disabled={
          busy ||
          seconds === null ||
          rounds === null ||
          !safe ||
          !canStartRehab(j, kind, false) ||
          !approved ||
          instruction !== j.rehabPlans.find((p) => p.kind === kind)?.instruction
        }
        label={t("운동 프로그램 시작", "Start exercise program")}
        onPress={() => void start()}
      />
      <Copy muted>
        {t(
          "불편감은 치료 효과 판정이 아니라 본인이 남기는 느낌입니다. 강도와 횟수를 앱이 자동으로 높이지 않습니다.",
          "Discomfort is your report, not a treatment-effect assessment. The app does not automatically increase intensity or repetitions.",
        )}
      </Copy>
      <Button
        secondary
        label={t("공식 운동 자료 보기", "Open official exercise guidance")}
        onPress={() =>
          void Linking.openURL(
            kind === "balance_supported"
              ? rehabSources.balance
              : kind === "gaze_vertical"
                ? rehabSources.vertical
                : rehabSources.gaze,
          )
        }
      />
      <Heading small>{t("수행 기록", "Exercise records")}</Heading>
      {[...j.rehabLogs]
        .sort((a, b) => b.occurredAt - a.occurredAt)
        .map((l) => (
          <Button
            key={l.id}
            secondary
            label={`${l.date} · ${rehabName(l.kind, t)} · ${rehabOutcome(l.outcome, t)}`}
            onPress={() => {
              setEditing(l);
              setBefore(l.before === null ? "" : String(l.before));
              setAfter(l.after === null ? "" : String(l.after));
              setNote(l.note);
            }}
          />
        ))}
      {!j.rehabLogs.length && (
        <Copy muted>
          {t(
            "운동을 시작하면 미완료 기록을 먼저 저장합니다. 완료·중단 기록은 진료 요약과 백업에 함께 들어갑니다.",
            "An unfinished record is saved when you start. Completed and stopped sessions are included in visit summaries and backups.",
          )}
        </Copy>
      )}
    </>
  );
}

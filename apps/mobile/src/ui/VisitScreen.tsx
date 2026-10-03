import React, { useState } from "react";
import { Alert } from "react-native";
import * as Print from "expo-print";
import { File } from "expo-file-system";
import { localDate, shiftDate, summarize } from "@meniere/product-core";
import { clock, ids } from "../adapters/storage";
import { documents, sharing } from "../adapters/documents";
import { Button, Card, Copy, Field, Heading } from "./components";
import { symptomName, timeName, translator } from "./labels";
import type { ScreenProps } from "./screen-types";
export function VisitScreen({ journal: j, busy, commit, run }: ScreenProps) {
  const t = translator(j.settings.language),
    today = localDate(clock.now(), clock.timeZone()),
    latest = [...j.visits].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const [from, setFrom] = useState(shiftDate(today, -27)),
    [to, setTo] = useState(today),
    [date, setDate] = useState(latest?.date ?? today),
    [questions, setQuestions] = useState(latest?.questions.join("\n") ?? ""),
    [note, setNote] = useState(latest?.note ?? "");
  const list = questions
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  let summary;
  try {
    summary = summarize(j, from, to, clock.now(), list);
  } catch {
    summary = null;
  }
  const share = () =>
    Alert.alert(
      t("건강 기록 공유", "Share health records"),
      t(
        "파일에는 건강 기록이 들어갑니다. 공유 대상을 직접 확인해 주세요. 내보낸 파일은 앱에서 회수할 수 없습니다.",
        "This file contains health records. Check the recipient yourself. Exported files cannot be recalled by this app.",
      ),
      [
        { text: t("취소", "Cancel"), style: "cancel" },
        {
          text: t("PDF 공유", "Share PDF"),
          onPress: () =>
            void run(async () => {
              if (summary)
                await sharing.share(
                  await documents.pdf(summary, j.settings.language),
                  "application/pdf",
                );
            }),
        },
      ],
    );
  return (
    <>
      <Heading>{t("진료를 준비하세요", "Prepare for your visit")}</Heading>
      <Copy muted>
        {t(
          "기록한 사실과 빈 날을 함께 정리합니다.",
          "Review your records together with the gaps.",
        )}
      </Copy>
      {j.visits.length > 0 && (
        <Card>
          <Heading small>
            {t("저장한 진료 준비", "Saved visit preparations")}
          </Heading>
          {[...j.visits]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((v) => (
              <Button
                key={v.id}
                secondary
                disabled={busy}
                label={v.date}
                onPress={() => {
                  setDate(v.date);
                  setQuestions(v.questions.join("\n"));
                  setNote(v.note);
                }}
              />
            ))}
        </Card>
      )}
      <Field
        label={t("시작일 · YYYY-MM-DD", "From · YYYY-MM-DD")}
        value={from}
        onChangeText={setFrom}
      />
      <Field
        label={t("종료일 · YYYY-MM-DD", "To · YYYY-MM-DD")}
        value={to}
        onChangeText={setTo}
      />
      {summary ? (
        <>
          <Card>
            <Heading small>{t("기록 범위", "Record coverage")}</Heading>
            <Copy>
              {summary.totalDays}
              {t("일 중 ", " days · ")}
              {summary.recordedDays}
              {t("일 하루 상태 입력", " daily check-ins")}
            </Copy>
            <Copy>
              {t("미기록", "Unrecorded")}: {summary.missingDays}
              {t("일", " days")}
            </Copy>
            <Copy>
              {t("기록된 발작", "Recorded episodes")}: {summary.episodeCount}
            </Copy>
            <Copy>
              {t("정확한 지속 시간", "Exact durations")}: {summary.exactCount} ·{" "}
              {t("대략", "Approximate")}: {summary.approximateCount} ·{" "}
              {t("미확정", "Unknown")}: {summary.unknownCount}
            </Copy>
            <Copy>
              {t(
                "정확한 전체 지속 시간 평균",
                "Mean full duration of exact records",
              )}
              :{" "}
              {summary.meanMinutes === null
                ? "—"
                : `${Math.round(summary.meanMinutes)} ${t("분", "min")}`}
            </Copy>
            <Copy muted>
              {t(
                "미기록은 증상 없음이 아닙니다.",
                "Unrecorded does not mean symptom-free.",
              )}
            </Copy>
          </Card>
          {summary.episodes.map((e) => (
            <Card key={e.id}>
              <Heading small>{e.date}</Heading>
              <Copy>
                {timeName(e.start, e.timeZone, j.settings.language)} →{" "}
                {timeName(e.end, e.timeZone, j.settings.language)}
              </Copy>
              <Copy>
                {e.symptoms.map((s) => symptomName(s, t)).join(" · ") ||
                  t("증상 미입력", "Symptoms not entered")}
              </Copy>
              {e.crossesBoundary && (
                <Copy muted>
                  {t(
                    "선택 기간 경계에 걸친 기록",
                    "Record crosses selected period boundary",
                  )}
                </Copy>
              )}
            </Card>
          ))}
        </>
      ) : (
        <Copy>
          {t(
            "날짜 범위를 확인해 주세요. 최대 10년까지 선택할 수 있습니다.",
            "Check the date range. Select up to 10 years.",
          )}
        </Copy>
      )}
      <Field
        label={t("방문일 · YYYY-MM-DD", "Visit date · YYYY-MM-DD")}
        value={date}
        onChangeText={setDate}
      />
      <Field
        label={t("질문 · 한 줄에 하나", "Questions · one per line")}
        multiline
        value={questions}
        onChangeText={setQuestions}
      />
      <Field
        label={t(
          "의료진 설명 메모 · 기기에만 보관",
          "Clinician notes · kept on device",
        )}
        multiline
        value={note}
        onChangeText={setNote}
      />
      <Button
        secondary
        disabled={busy}
        label={t("진료 준비 저장", "Save visit preparation")}
        onPress={() => {
          const now = clock.now(),
            existing = j.visits.find((v) => v.date === date);
          void commit({
            ...j,
            visits: [
              ...j.visits.filter((v) => v.date !== date),
              {
                ...(existing ?? { id: ids.next(), createdAt: now }),
                updatedAt: now,
                date,
                questions: list,
                note,
              },
            ],
          });
        }}
      />
      {j.visits.some((v) => v.date === date) && (
        <Button
          secondary
          danger
          disabled={busy}
          label={t("이 진료 준비 삭제", "Delete this visit preparation")}
          onPress={() =>
            Alert.alert(t("진료 준비 삭제", "Delete visit preparation"), date, [
              { text: t("취소", "Cancel"), style: "cancel" },
              {
                text: t("삭제", "Delete"),
                style: "destructive",
                onPress: () =>
                  void commit({
                    ...j,
                    visits: j.visits.filter((v) => v.date !== date),
                  }).then((ok) => {
                    if (ok) {
                      setQuestions("");
                      setNote("");
                    }
                  }),
              },
            ])
          }
        />
      )}
      <Button
        secondary
        disabled={busy || !summary}
        label={t("PDF 미리보기", "Preview PDF")}
        onPress={() =>
          void run(async () => {
            if (!summary) return;
            const uri = await documents.pdf(summary, j.settings.language);
            try {
              await Print.printAsync({ uri });
            } finally {
              const file = new File(uri);
              if (file.exists) file.delete();
            }
          })
        }
      />
      <Button
        disabled={busy || !summary}
        label={t("PDF 공유·저장", "Share / save PDF")}
        onPress={share}
      />
      <Copy muted>
        {t(
          "PDF에는 선택한 기간과 질문이 들어갑니다. 의료진 설명 메모는 CSV와 암호화 백업에만 포함됩니다.",
          "The PDF includes the selected period and questions. Clinician notes are included only in CSV and encrypted backups.",
        )}
      </Copy>
    </>
  );
}

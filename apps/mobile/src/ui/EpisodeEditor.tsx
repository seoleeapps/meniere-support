import React, { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  localDate,
  unknownTime,
  type Accuracy,
  type Episode,
  type Language,
  type TimeValue,
} from "@meniere/product-core";
import { Button, Card, Choices, Copy, Field, Heading } from "./components";
import {
  accuracyName,
  earName,
  impactName,
  timeName,
  translator,
} from "./labels";
import { SymptomChoices } from "./SymptomChoices";
function TimeField({
  label,
  time,
  zone,
  language,
  onChange,
}: {
  label: string;
  time: TimeValue;
  zone: string;
  language: Language;
  onChange: (time: TimeValue) => void;
}) {
  const t = translator(language),
    [mode, setMode] = useState<"date" | "time" | null>(null);
  return (
    <Card>
      <Copy>{label}</Copy>
      <Choices<Accuracy>
        label={t("시각의 정확도", "Time accuracy")}
        values={["exact", "approximate", "unknown"]}
        selected={[time.accuracy]}
        onChange={(accuracy) =>
          onChange(
            accuracy === "unknown"
              ? unknownTime()
              : { value: time.value ?? Date.now(), accuracy },
          )
        }
        name={(a) => accuracyName(a, t)}
      />
      <Copy>{timeName(time, zone, language)}</Copy>
      {time.value !== null && (
        <View>
          <Button
            secondary
            label={t("날짜 바꾸기", "Change date")}
            onPress={() => setMode("date")}
          />
          <Button
            secondary
            label={t("시각 바꾸기", "Change time")}
            onPress={() => setMode("time")}
          />
        </View>
      )}
      {mode && time.value !== null && (
        <>
          <DateTimePicker
            value={new Date(time.value)}
            mode={mode}
            timeZoneName={zone}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (Platform.OS !== "ios") setMode(null);
              if (event.type !== "dismissed" && date)
                onChange({ ...time, value: date.getTime() });
            }}
          />
          {Platform.OS === "ios" && (
            <Button
              secondary
              label={t("확인", "Done")}
              onPress={() => setMode(null)}
            />
          )}
        </>
      )}
    </Card>
  );
}
export function EpisodeEditor({
  initial,
  language,
  busy,
  onSave,
  onDelete,
  onBack,
}: {
  initial: Episode;
  language: Language;
  busy: boolean;
  onSave: (e: Episode) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const [e, set] = useState(initial),
    t = translator(language);
  return (
    <>
      <Button secondary label={t("돌아가기", "Back")} onPress={onBack} />
      <Heading>{t("발작 기록", "Episode record")}</Heading>
      <Copy muted>
        {t(
          "기억나는 만큼만 남겨도 됩니다. 모르는 시각은 그대로 두세요.",
          "Enter what you remember. It is okay to leave times unknown.",
        )}
      </Copy>
      <SymptomChoices
        selected={e.symptoms}
        disabled={busy}
        t={t}
        onChange={(s) =>
          set((current) => ({
            ...current,
            symptoms: current.symptoms.includes(s)
              ? current.symptoms.filter((x) => x !== s)
              : [...current.symptoms, s],
          }))
        }
      />
      <Field
        label={t("발생일 · YYYY-MM-DD", "Occurrence date · YYYY-MM-DD")}
        value={e.date}
        editable={e.start.value === null}
        onChangeText={(date) => set({ ...e, date })}
        autoCapitalize="none"
      />
      <Copy muted>{e.timeZone}</Copy>
      <TimeField
        label={t("시작", "Start")}
        time={e.start}
        zone={e.timeZone}
        language={language}
        onChange={(start) =>
          set({
            ...e,
            start,
            date:
              start.value === null
                ? e.date
                : localDate(start.value, e.timeZone),
          })
        }
      />
      <TimeField
        label={t("어지럼 종료", "Vertigo ended")}
        time={e.end}
        zone={e.timeZone}
        language={language}
        onChange={(end) => set({ ...e, end, active: false })}
      />
      <TimeField
        label={t("일상 복귀", "Returned to daily activities")}
        time={e.recovery}
        zone={e.timeZone}
        language={language}
        onChange={(recovery) => set({ ...e, recovery })}
      />
      <Choices
        label={t("귀", "Ear")}
        values={["left", "right", "both", "unknown"] as const}
        selected={[e.ear]}
        name={(v) => earName(v, t)}
        onChange={(ear) => set({ ...e, ear })}
      />
      <Choices
        label={t("일상 영향", "Impact on daily activities")}
        values={["none", "some", "major", "unknown"] as const}
        selected={[e.impact]}
        name={(v) => impactName(v, t)}
        onChange={(impact) => set({ ...e, impact })}
      />
      <Field
        label={t("증상 메모", "Symptom notes")}
        multiline
        value={e.note}
        onChangeText={(note) => set({ ...e, note })}
      />
      <Field
        label={t(
          "복약·치료 변경 사실 · 선택 사항",
          "Medication / treatment changes · optional",
        )}
        multiline
        value={e.treatment}
        onChangeText={(treatment) => set({ ...e, treatment })}
      />
      <Button
        label={t("기록 저장", "Save record")}
        testID="save-episode"
        disabled={busy}
        onPress={() =>
          onSave({ ...e, updatedAt: Math.max(Date.now(), e.createdAt) })
        }
      />
      {e.active && (
        <Button
          secondary
          label={t("종료 시각 모름으로 마치기", "Finish with end time unknown")}
          disabled={busy}
          onPress={() => onSave({ ...e, active: false, updatedAt: Date.now() })}
        />
      )}
      <Button
        secondary
        danger
        label={t("이 기록 삭제", "Delete this record")}
        disabled={busy}
        onPress={() => onDelete(e.id)}
      />
    </>
  );
}

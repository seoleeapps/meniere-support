import React, { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  mergeRestore,
  previewRestore,
  type Journal,
  type Language,
} from "@meniere/product-core";
import type { EncryptedJournal } from "../adapters/storage";
import { ads } from "../adapters/ads";
import { documents, sharing } from "../adapters/documents";
import { Button, Card, Choices, Copy, Field, Heading } from "./components";
import { translator } from "./labels";
import type { ScreenProps } from "./screen-types";
export function SettingsScreen({
  journal: j,
  busy,
  commit,
  run,
  repository,
  onErase,
  onAdsChanged,
  onEditingChange,
}: ScreenProps & {
  repository: EncryptedJournal;
  onErase: () => void;
  onAdsChanged: () => void;
}) {
  const t = translator(j.settings.language),
    s = j.settings;
  const [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [incoming, setIncoming] = useState<Journal | null>(null),
    [replace, setReplace] = useState<string[]>([]);
  const [contactName, setName] = useState(s.contactName),
    [contactPhone, setPhone] = useState(s.contactPhone),
    [emergencyPhone, setEmergency] = useState(s.emergencyPhone),
    [hour, setHour] = useState(String(s.reminder.hour)),
    [minute, setMinute] = useState(String(s.reminder.minute));
  useEffect(() => {
    onEditingChange(Boolean(password || incoming));
    return () => onEditingChange(false);
  }, [Boolean(password || incoming), onEditingChange]);
  const exportCsv = () =>
    Alert.alert(
      t("원본 기록 공유", "Share original records"),
      t(
        "CSV는 암호화되지 않습니다. 건강 기록과 메모가 포함됩니다. 공유 대상을 확인해 주세요.",
        "CSV is not encrypted and contains health records and notes. Check the recipient.",
      ),
      [
        { text: t("취소", "Cancel"), style: "cancel" },
        {
          text: t("공유·저장", "Share / save"),
          onPress: () =>
            void run(async () => {
              await sharing.share(await documents.csv(j), "text/csv");
            }),
        },
      ],
    );
  const backup = () =>
    void run(async () => {
      if (password !== confirmPassword) throw new Error("PASSWORD_MISMATCH");
      const uri = await repository.create(password);
      setPassword("");
      setConfirmPassword("");
      try {
        await sharing.share(uri, "application/octet-stream");
      } finally {
        const file = new File(uri);
        if (file.exists) file.delete();
      }
    });
  const inspect = () =>
    void run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (selected.canceled) return;
      const restored = await repository.inspect(
        selected.assets[0].uri,
        password,
      );
      setIncoming(restored);
      setReplace([]);
      setPassword("");
      setConfirmPassword("");
    });
  const preview = incoming ? previewRestore(j, incoming) : null;
  return (
    <>
      <Heading>{t("설정과 보관", "Settings & storage")}</Heading>
      <Choices<Language>
        label={t("언어", "Language")}
        values={["ko", "en"]}
        selected={[s.language]}
        name={(l) => (l === "ko" ? "한국어" : "English")}
        onChange={(language) => {
          if (!busy) void commit({ ...j, settings: { ...s, language } });
        }}
      />
      <Choices
        label={t("화면 테마", "Appearance")}
        values={["system", "light", "dark"] as const}
        selected={[s.theme]}
        name={(v) =>
          ({
            system: t("기기 설정", "System"),
            light: t("밝게", "Light"),
            dark: t("어둡게", "Dark"),
          })[v]
        }
        onChange={(theme) => {
          if (!busy) void commit({ ...j, settings: { ...s, theme } });
        }}
      />
      <Card>
        <Heading small>
          {t("하루 확인 알림", "Daily check-in reminder")}
        </Heading>
        <Copy muted>
          {t(
            "잠금 화면에 증상이나 앱의 질환 이름을 표시하지 않습니다. 전달이 보장되지는 않습니다.",
            "Notifications do not show symptoms or the condition name. Delivery is not guaranteed.",
          )}
        </Copy>
        <Field
          label={t("시 · 0~23", "Hour · 0–23")}
          keyboardType="number-pad"
          value={hour}
          maxLength={2}
          onChangeText={setHour}
        />
        <Field
          label={t("분 · 0~59", "Minute · 0–59")}
          keyboardType="number-pad"
          value={minute}
          maxLength={2}
          onChangeText={setMinute}
        />
        <Button
          secondary
          disabled={busy}
          label={
            s.reminder.enabled
              ? t("알림 끄기", "Turn off reminder")
              : t("알림 켜기", "Turn on reminder")
          }
          onPress={() =>
            void commit({
              ...j,
              settings: {
                ...s,
                reminder: {
                  enabled: !s.reminder.enabled,
                  hour: Number(hour),
                  minute: Number(minute),
                  paused: false,
                },
              },
            })
          }
        />
        {s.reminder.enabled && (
          <>
            <Button
              secondary
              disabled={busy}
              label={t("알림 시각 저장", "Save reminder time")}
              onPress={() =>
                void commit({
                  ...j,
                  settings: {
                    ...s,
                    reminder: {
                      ...s.reminder,
                      hour: Number(hour),
                      minute: Number(minute),
                    },
                  },
                })
              }
            />
            <Button
              secondary
              disabled={busy}
              label={
                s.reminder.paused
                  ? t("알림 다시 받기", "Resume reminders")
                  : t("아픈 동안 알림 쉬기", "Pause reminders while unwell")
              }
              onPress={() =>
                void commit({
                  ...j,
                  settings: {
                    ...s,
                    reminder: { ...s.reminder, paused: !s.reminder.paused },
                  },
                })
              }
            />
          </>
        )}
      </Card>
      <Card>
        <Heading small>{t("도움 연락처", "Help contacts")}</Heading>
        <Field
          label={t("이름 · 선택 사항", "Name · optional")}
          value={contactName}
          maxLength={200}
          onChangeText={setName}
        />
        <Field
          label={t("연락할 전화번호", "Contact phone number")}
          keyboardType="phone-pad"
          value={contactPhone}
          maxLength={100}
          onChangeText={setPhone}
        />
        <Field
          label={t(
            "직접 확인한 현지 응급 번호 · 선택 사항",
            "Verified local emergency number · optional",
          )}
          keyboardType="phone-pad"
          value={emergencyPhone}
          maxLength={100}
          onChangeText={setEmergency}
        />
        <Copy muted>
          {t(
            "여행할 때 번호를 직접 확인해 주세요. 언어나 위치로 국가를 추정하지 않습니다.",
            "Check local numbers yourself when traveling. Language and location do not determine your country.",
          )}
        </Copy>
        <Button
          secondary
          disabled={busy}
          label={t("연락처 저장", "Save contacts")}
          onPress={() =>
            void commit({
              ...j,
              settings: { ...s, contactName, contactPhone, emergencyPhone },
            })
          }
        />
      </Card>
      <Card>
        <Heading small>{t("내 기록 보관", "Keep your records")}</Heading>
        <Copy>
          {t(
            "기기 분실이나 앱 삭제 후에는 수동 백업이 없으면 복구할 수 없습니다.",
            "Without a manual backup, records cannot be recovered after device loss or uninstall.",
          )}
        </Copy>
        <Button
          secondary
          disabled={busy}
          label={t("원본 CSV 공유·저장", "Share / save original CSV")}
          onPress={exportCsv}
        />
        <Field
          label={t(
            "백업 비밀번호 · 새 백업은 12자 이상",
            "Backup password · at least 12 characters for new backup",
          )}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={1024}
        />
        <Field
          label={t("새 백업 비밀번호 확인", "Confirm new backup password")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={1024}
        />
        <Copy muted>
          {t(
            "비밀번호를 앱이 보관하지 않습니다. 잊으면 백업을 복구할 수 없습니다.",
            "The app does not store this password. A forgotten password cannot be recovered.",
          )}
        </Copy>
        <Button
          secondary
          disabled={busy}
          label={t("암호화 백업 공유·저장", "Share / save encrypted backup")}
          onPress={backup}
        />
        <Button
          secondary
          disabled={busy}
          label={t(
            "백업 선택·복원 미리보기",
            "Choose backup / preview restore",
          )}
          onPress={inspect}
        />
        {preview && incoming && (
          <>
            <Heading small>{t("복원 미리보기", "Restore preview")}</Heading>
            <Copy>
              {preview.from ?? "—"} — {preview.to ?? "—"}
            </Copy>
            <Copy>
              {t("새 기록", "New records")}: {preview.newCount} ·{" "}
              {t("동일 기록", "Identical records")}: {preview.identicalCount} ·{" "}
              {t("충돌", "Conflicts")}: {preview.conflicts.length}
            </Copy>
            <Copy muted>
              {t(
                "기존 기록을 유지합니다. 바꿀 기록만 선택해 주세요. 기기의 설정과 연락처는 유지됩니다.",
                "Existing records are kept. Select only records to replace. Device preferences and contacts stay unchanged.",
              )}
            </Copy>
            {preview.conflicts.map((key) => {
              const [collection, id] = key.split(":");
              const records =
                incoming[
                  collection as
                    | "episodes"
                    | "days"
                    | "habits"
                    | "habitLogs"
                    | "visits"
                ];
              const record = records.find((r) => r.id === id)!;
              const kind = {
                episodes: t("발작", "Episode"),
                days: t("하루 상태", "Daily status"),
                habits: t("생활 항목", "Habit"),
                habitLogs: t("생활 확인", "Habit check-in"),
                visits: t("진료 준비", "Visit preparation"),
              }[collection];
              return (
                <Button
                  key={key}
                  secondary
                  disabled={busy}
                  label={`${replace.includes(key) ? "✓ " : ""}${kind} · ${"date" in record ? record.date : "title" in record ? record.title : ""} · ${t("교체", "Replace")}`}
                  onPress={() =>
                    setReplace(
                      replace.includes(key)
                        ? replace.filter((x) => x !== key)
                        : [...replace, key],
                    )
                  }
                />
              );
            })}
            <Button
              disabled={busy}
              label={t("선택한 내용 복원", "Restore selected records")}
              onPress={async () => {
                let merged: Journal;
                try {
                  merged = mergeRestore(j, incoming, replace);
                } catch {
                  Alert.alert(
                    t("복원할 수 없습니다", "Cannot restore"),
                    t(
                      "생활 항목은 최대 3개, 진행 중 발작은 하나만 남길 수 있습니다. 충돌 선택을 확인해 주세요.",
                      "Keep at most 3 active habits and 1 ongoing episode. Check your conflict choices.",
                    ),
                  );
                  return;
                }
                if (await commit(merged)) {
                  setIncoming(null);
                  setReplace([]);
                }
              }}
            />
            <Button
              secondary
              disabled={busy}
              label={t("복원 취소", "Cancel restore")}
              onPress={() => {
                setIncoming(null);
                setReplace([]);
              }}
            />
          </>
        )}
      </Card>
      <Card>
        <Heading small>{t("광고와 개인정보", "Ads & privacy")}</Heading>
        <Copy>
          {t(
            "배너 광고만 사용합니다. 건강 기록과 메모는 광고에 전달하지 않습니다. 광고 제공자는 기기·네트워크·광고 상호작용 정보를 처리할 수 있습니다.",
            "Only banner ads are shown. Health records and notes are not sent to ads. The ad provider may process device, network and ad interaction data.",
          )}
        </Copy>
        <Button
          secondary
          disabled={busy}
          label={t("광고 개인정보 선택", "Advertising privacy choices")}
          onPress={() =>
            void run(async () => {
              try {
                await ads.privacyOptions();
              } finally {
                onAdsChanged();
              }
            })
          }
        />
        <Button
          secondary
          label={t("개인정보 안내", "Privacy information")}
          onPress={() =>
            void Linking.openURL(
              "https://www.seorilabs.com/apps/meniere-support/privacy/",
            ).catch(() =>
              Alert.alert(t("연결할 수 없습니다", "Unable to open link")),
            )
          }
        />
        <Button
          secondary
          label={t("문의", "Support")}
          onPress={() =>
            void Linking.openURL("mailto:cs@seorilabs.com").catch(() =>
              Alert.alert(t("메일 앱을 확인해 주세요", "Check your email app")),
            )
          }
        />
      </Card>
      <Button
        secondary
        danger
        disabled={busy}
        label={t("전체 기록·설정 삭제", "Delete all records & settings")}
        onPress={() =>
          Alert.alert(
            t("모든 기기 기록 삭제", "Delete all records on this device"),
            t(
              "기록, 연락처, 설정, 알림과 암호화 키를 삭제합니다. 수동 백업이 없으면 복구할 수 없습니다. 이미 내보낸 파일은 삭제되지 않습니다.",
              "This deletes records, contacts, settings, reminders and the encryption key. Recovery requires a manual backup. Exported files are not deleted.",
            ),
            [
              { text: t("취소", "Cancel"), style: "cancel" },
              {
                text: t("모두 삭제", "Delete all"),
                style: "destructive",
                onPress: onErase,
              },
            ],
          )
        }
      />
      <Copy muted>Meniere Journal · 0.1.0</Copy>
    </>
  );
}

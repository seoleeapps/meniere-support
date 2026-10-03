import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import admob from "../../release/admob.json";
import * as Localization from "expo-localization";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenCapture from "expo-screen-capture";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import {
  beginEpisode,
  emptyJournal,
  endEpisode,
  localDate,
  saveDay,
  saveEpisode,
  shiftDate,
  unknownTime,
  validateJournal,
  type Episode,
  type Journal,
} from "@meniere/product-core";
import {
  cleanTemporaryFiles,
  clock,
  EncryptedJournal,
  ids,
} from "./src/adapters/storage";
import { ads } from "./src/adapters/ads";
import { reminders } from "./src/adapters/reminders";
import {
  Button,
  Card,
  Choices,
  Copy,
  dark,
  Field,
  Heading,
  InputFocusContext,
  layout,
  light,
  PaletteContext,
} from "./src/ui/components";
import { EpisodeEditor } from "./src/ui/EpisodeEditor";
import { RehabScreen } from "./src/ui/RehabScreen";
import { HabitScreen } from "./src/ui/HabitScreen";
import { VisitScreen } from "./src/ui/VisitScreen";
import { SettingsScreen } from "./src/ui/SettingsScreen";
import { symptomName, timeName, translator } from "./src/ui/labels";

if (__DEV__) require("./src/adapters/native-qa").installNativeQa();
void SplashScreen.preventAutoHideAsync();
type Tab =
  | "home"
  | "history"
  | "habits"
  | "visit"
  | "settings"
  | "help"
  | "rehab";
const locale =
  Localization.getLocales()[0]?.languageCode === "ko" ? "ko" : "en";
const repository = new EncryptedJournal(locale);
export default function App() {
  return (
    <SafeAreaProvider>
      <JournalApp />
    </SafeAreaProvider>
  );
}
function JournalApp() {
  const [journal, setJournal] = useState<Journal | null>(null),
    [loadError, setLoadError] = useState(false),
    [tab, setTab] = useState<Tab>("home"),
    [episode, setEpisode] = useState<Episode | null>(null),
    [busy, setBusy] = useState(false),
    [adsReady, setAdsReady] = useState(false),
    [fieldFocused, setFieldFocused] = useState(false),
    [formActive, setFormActive] = useState(false),
    [rehabTargetActive, setRehabTargetActive] = useState(false),
    [consentRevision, setConsentRevision] = useState(0),
    [bannerFailed, setBannerFailed] = useState(false),
    [foreground, setForeground] = useState(true),
    [dayDate, setDayDate] = useState(localDate(clock.now(), clock.timeZone())),
    [dayEditor, setDayEditor] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const locked = useRef(false),
    consentRequested = useRef(false),
    scheme = useColorScheme();
  const t = translator(journal?.settings.language ?? locale),
    palette =
      journal?.settings.theme === "dark" ||
      (journal?.settings.theme !== "light" && scheme === "dark")
        ? dark
        : light;
  const initialize = async () => {
    setLoadError(false);
    try {
      cleanTemporaryFiles();
      const loaded = await repository.load();
      setJournal(loaded);
    } catch {
      setLoadError(true);
    } finally {
      await SplashScreen.hideAsync();
    }
  };
  useEffect(() => {
    void initialize();
    if (Platform.OS === "ios")
      void ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {});
    else if (!__DEV__)
      void ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  const active = journal?.episodes.find((e) => e.active);
  useEffect(() => {
    if (
      !journal?.settings.onboarded ||
      active ||
      busy ||
      episode ||
      dayEditor ||
      !foreground ||
      !["settings", "habits"].includes(tab) ||
      consentRequested.current
    )
      return;
    consentRequested.current = true;
    void ads
      .prepare()
      .then(setAdsReady)
      .catch(() => setAdsReady(false));
  }, [
    journal?.settings.onboarded,
    consentRevision,
    active,
    busy,
    episode,
    dayEditor,
    foreground,
    tab,
  ]);
  const errorMessage = (error: unknown) => {
    const code = error instanceof Error ? error.message : "";
    return (
      (
        {
          INVALID_RECORD: t(
            "날짜, 시간의 순서와 입력 범위를 확인해 주세요.",
            "Check dates, time order and input ranges.",
          ),
          PASSWORD_LENGTH: t(
            "새 백업 비밀번호는 12자 이상이어야 합니다.",
            "Use at least 12 characters for a new backup password.",
          ),
          PASSWORD_MISMATCH: t(
            "비밀번호 확인이 일치하지 않습니다.",
            "The password confirmation does not match.",
          ),
          INVALID_BACKUP: t(
            "백업 파일 또는 비밀번호를 확인해 주세요. 기존 기록은 유지됩니다.",
            "Check the backup file and password. Existing records remain unchanged.",
          ),
          NOTIFICATIONS_DENIED: t(
            "알림 권한이 없습니다. 기기 설정에서 허용할 수 있습니다.",
            "Notification permission was not granted. You can allow it in device settings.",
          ),
          ALREADY_ACTIVE: t(
            "진행 중인 기록을 먼저 확인해 주세요.",
            "Check the ongoing record first.",
          ),
          SHARING_UNAVAILABLE: t(
            "이 기기에서 공유 화면을 열 수 없습니다.",
            "Sharing is unavailable on this device.",
          ),
        } as Record<string, string>
      )[code] ??
      t(
        "작업을 완료하지 못했습니다. 기존 기록을 보존했습니다. 저장 공간과 백업 비밀번호를 확인해 주세요.",
        "The operation could not be completed. Existing records are preserved. Check storage space and the backup password.",
      )
    );
  };
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(t("확인해 주세요", "Please check"), errorMessage(error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const commit = async (next: Journal): Promise<boolean> => {
    if (locked.current) return false;
    let success = false;
    await run(async () => {
      validateJournal(next);
      const reminderChanged =
        journal &&
        (JSON.stringify(next.settings.reminder) !==
          JSON.stringify(journal.settings.reminder) ||
          next.settings.language !== journal.settings.language);
      if (reminderChanged && !(await reminders.apply(next.settings)))
        throw new Error("NOTIFICATIONS_DENIED");
      try {
        await repository.save(next);
      } catch (error) {
        if (reminderChanged && journal)
          await reminders.apply(journal.settings).catch(() => {});
        throw error;
      }
      setJournal(next);
      success = true;
    });
    return success;
  };
  const changeTab = (next: Tab) => {
    if (busy && next !== "help") return;
    setEpisode(null);
    setDayEditor(false);
    setFieldFocused(false);
    setFormActive(false);
    setTab(next);
    setBannerFailed(false);
  };
  const deleteEpisode = (id: string) =>
    Alert.alert(
      t("기록 삭제", "Delete record"),
      t("이 발작 기록을 삭제할까요?", "Delete this episode record?"),
      [
        { text: t("취소", "Cancel"), style: "cancel" },
        {
          text: t("삭제", "Delete"),
          style: "destructive",
          onPress: () => {
            if (journal)
              void commit({
                ...journal,
                episodes: journal.episodes.filter((e) => e.id !== id),
              }).then((success) => {
                if (success) setEpisode(null);
              });
          },
        },
      ],
    );
  const openContact = async (phone: string, sms = false) => {
    const number = phone.replace(/[^+\d*#]/g, "");
    if (!number) {
      Alert.alert(
        t("연락처 설정 필요", "Set up a contact"),
        t(
          "설정에서 전화번호를 직접 입력해 주세요.",
          "Enter a phone number in settings.",
        ),
      );
      return;
    }
    try {
      await Linking.openURL(`${sms ? "sms" : "tel"}:${number}`);
    } catch {
      Alert.alert(
        t("연락 앱을 확인해 주세요", "Check your phone or messaging app"),
      );
    }
  };
  const props = journal
    ? { journal, busy, commit, run, onEditingChange: setFormActive }
    : null;
  const helpContent = (
    <>
      <Button
        secondary
        label={t("돌아가기", "Back")}
        onPress={() => changeTab("home")}
      />
      <Heading>{t("안전과 도움", "Safety & help")}</Heading>
      <Card>
        <Copy>
          {t(
            "어지럽다면 운전을 멈추고 안전한 곳에서 도움을 받으세요.",
            "If you feel dizzy, stop driving and seek help in a safe place.",
          )}
        </Copy>
        <Copy>
          {t(
            "갑작스러운 얼굴 처짐, 팔의 힘 빠짐, 말하기 어려움, 시야 이상이나 심한 균형 이상이 함께 나타나면 평소 증상으로 단정하지 말고 즉시 현지 응급 도움을 받으세요.",
            "If dizziness comes with sudden facial drooping, arm weakness, difficulty speaking, vision changes or severe balance problems, seek local emergency help immediately. Do not assume it is your usual episode.",
          )}
        </Copy>
        <Copy>
          {t(
            "갑작스러운 청력 저하는 기록만 남기고 기다리지 말고 신속하게 의료기관의 평가를 받으세요.",
            "Seek urgent medical assessment for sudden hearing loss rather than only recording it and waiting.",
          )}
        </Copy>
        <Copy muted>
          {t(
            "이 화면은 응급 여부를 판정하지 않습니다. 연락 버튼은 전화·문자 앱을 열 뿐이며 응답이나 구급 요청 접수를 보장하지 않습니다.",
            "This screen does not determine whether a situation is an emergency. Contact buttons only open phone or messaging apps; they do not guarantee a response or dispatch.",
          )}
        </Copy>
      </Card>
      <Button
        label={t("연락처에 전화", "Call my contact")}
        onPress={() => void openContact(journal?.settings.contactPhone ?? "")}
      />
      <Button
        secondary
        label={t("연락처에 문자", "Message my contact")}
        onPress={() =>
          void openContact(journal?.settings.contactPhone ?? "", true)
        }
      />
      {journal?.settings.emergencyPhone && (
        <Button
          secondary
          label={t(
            "설정한 현지 응급 번호에 전화",
            "Call saved local emergency number",
          )}
          onPress={() => void openContact(journal?.settings.emergencyPhone)}
        />
      )}
      <Button
        secondary
        label={t("연락처 설정", "Set up contacts")}
        onPress={() => changeTab("settings")}
      />
      <Copy muted>
        {t(
          "출처: NHS 메니에르병·청력 저하 안내 · 2026-10-03 확인",
          "Sources: NHS Ménière’s disease and hearing loss · checked 2026-10-03",
        )}
      </Copy>
      <Button
        secondary
        label={t("의료 안내 출처", "Medical information sources")}
        onPress={() =>
          void Linking.openURL(
            "https://www.nhs.uk/conditions/menieres-disease/",
          ).catch(() =>
            Alert.alert(t("연결할 수 없습니다", "Unable to open link")),
          )
        }
      />
    </>
  );
  let content: React.ReactNode;
  if (tab === "help") content = helpContent;
  else if (!journal)
    content = (
      <>
        <Heading>{t("메니에르 기록", "Meniere Journal")}</Heading>
        <Copy>
          {loadError
            ? t(
                "기록을 안전하게 열지 못했습니다. 기존 자료는 삭제하지 않았습니다.",
                "Unable to open your records securely. Existing data has not been deleted.",
              )
            : t("기록을 여는 중입니다.", "Opening your journal.")}
        </Copy>
        {loadError && (
          <>
            <Button
              label={t("다시 시도", "Try again")}
              onPress={() => void initialize()}
            />
            <Button
              secondary
              label={t("도움 안내", "Help & safety")}
              onPress={() => changeTab("help")}
            />
            <Button
              secondary
              label={t("지원 문의", "Contact support")}
              onPress={() => void Linking.openURL("mailto:cs@seorilabs.com")}
            />
          </>
        )}
      </>
    );
  else if (!journal.settings.onboarded)
    content = (
      <>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            letterSpacing: 2,
            color: palette.accent,
          }}
        >
          MENIERE JOURNAL
        </Text>
        <Heading>
          {t(
            "아플 때는 쉬고,\n편할 때 기록하세요.",
            "Rest when unwell.\nRecord when ready.",
          )}
        </Heading>
        <Card>
          <Copy>
            {t(
              "증상·생활 습관과 운동 수행을 기록하고 진료를 준비합니다. 의료진의 진료나 개인별 운동 처방을 대신하지 않습니다.",
              "Record symptoms, habits and exercise sessions, and prepare for your next visit. This app does not replace clinical care or a personal exercise prescription.",
            )}
          </Copy>
          <Copy>
            {t(
              "기록은 이 기기에 암호화하여 보관합니다. 계정이나 자동 동기화는 없습니다.",
              "Records are encrypted on this device. There is no account or automatic sync.",
            )}
          </Copy>
          <Copy>
            {t(
              "기기를 잃거나 앱을 삭제하면 수동 백업 없이는 복구할 수 없습니다.",
              "A manual backup is needed to recover records after device loss or uninstall.",
            )}
          </Copy>
          <Copy muted>
            {t(
              "광고 제공자는 기기·네트워크 정보를 처리할 수 있습니다. 건강 기록은 광고에 전달하지 않습니다.",
              "The ad provider may process device and network information. Health records are not sent to ads.",
            )}
          </Copy>
        </Card>
        <Choices
          label="Language / 언어"
          values={["ko", "en"] as const}
          selected={[journal.settings.language]}
          name={(l) => (l === "ko" ? "한국어" : "English")}
          onChange={(language) =>
            void commit({
              ...journal,
              settings: { ...journal.settings, language },
            })
          }
        />
        <Button
          label={t("기록 시작하기", "Open my journal")}
          testID="onboard"
          disabled={busy}
          onPress={() =>
            void commit({
              ...journal,
              settings: { ...journal.settings, onboarded: true },
            })
          }
        />
        <Button
          secondary
          label={t("도움 안내", "Help & safety")}
          onPress={() => changeTab("help")}
        />
      </>
    );
  else if (episode)
    content = (
      <EpisodeEditor
        key={episode.id}
        initial={episode}
        language={journal.settings.language}
        busy={busy}
        onBack={() => {
          if (!busy) setEpisode(null);
        }}
        onDelete={deleteEpisode}
        onSave={(e) => {
          try {
            void commit(saveEpisode(journal, e)).then((success) => {
              if (success) setEpisode(null);
            });
          } catch (error) {
            Alert.alert(
              t("입력 확인", "Check your entry"),
              errorMessage(error),
            );
          }
        }}
      />
    );
  else if (dayEditor)
    content = (
      <>
        <Button
          secondary
          label={t("돌아가기", "Back")}
          onPress={() => setDayEditor(false)}
        />
        <Heading>{t("하루 상태", "Daily status")}</Heading>
        <Field
          label={t("날짜 · YYYY-MM-DD", "Date · YYYY-MM-DD")}
          value={dayDate}
          onChangeText={setDayDate}
        />
        <Copy muted>
          {t(
            "하루 상태는 발작 기록과 별도로 남깁니다.",
            "Your daily status is separate from individual episodes.",
          )}
        </Copy>
        {(["none", "symptoms"] as const).map((status) => (
          <Button
            key={status}
            secondary
            disabled={busy}
            label={
              status === "none"
                ? t("증상 없음 확인", "Confirm no symptoms")
                : t("증상 있었음", "Symptoms occurred")
            }
            onPress={() => {
              try {
                const next = saveDay(
                  journal,
                  dayDate,
                  status,
                  clock.now(),
                  ids.next(),
                );
                void commit(next).then((success) => {
                  if (success) setDayEditor(false);
                });
              } catch (error) {
                Alert.alert(
                  t("입력 확인", "Check your entry"),
                  errorMessage(error),
                );
              }
            }}
          />
        ))}
        <Button
          secondary
          danger
          disabled={busy}
          label={t("하루 상태 기록 지우기", "Remove daily status")}
          onPress={() =>
            void commit({
              ...journal,
              days: journal.days.filter((d) => d.date !== dayDate),
            }).then((success) => {
              if (success) setDayEditor(false);
            })
          }
        />
      </>
    );
  else if (tab === "home") {
    const today = localDate(clock.now(), clock.timeZone()),
      day = journal.days.find((d) => d.date === today);
    content = (
      <>
        <Text style={{ fontSize: 16, color: palette.muted, letterSpacing: 1 }}>
          {today}
        </Text>
        <Heading>{t("오늘, 편한 만큼만", "At your own pace")}</Heading>
        <Copy muted>
          {t(
            "기억나는 것만 남겨도 괜찮습니다.",
            "It is okay to record only what you remember.",
          )}
        </Copy>
        {active ? (
          <Card>
            <Heading small>
              {t("시작 시각을 저장했어요", "Start time saved")}
            </Heading>
            <Copy>
              {timeName(
                active.start,
                active.timeZone,
                journal.settings.language,
              )}
            </Copy>
            <Copy muted>
              {t(
                "화면을 내려놓고 쉬어도 됩니다. 종료 시각은 나중에 남기세요.",
                "You can put your phone down and rest. Add the end time later.",
              )}
            </Copy>
            <Button
              disabled={busy}
              label={t("어지럼 종료 시각 저장", "Save vertigo end time")}
              onPress={() => {
                try {
                  const next = endEpisode(journal, active.id, clock.now());
                  void commit(next);
                } catch (error) {
                  Alert.alert(
                    t("입력 확인", "Check your entry"),
                    errorMessage(error),
                  );
                }
              }}
            />
            <Button
              secondary
              label={t("상세 보완·시작 취소", "Add details / cancel start")}
              onPress={() => setEpisode(active)}
            />
          </Card>
        ) : (
          <Card>
            <Button
              label={t("지금 시작", "Starting now")}
              testID="start-now"
              disabled={busy}
              onPress={() => {
                try {
                  const next = beginEpisode(journal, clock, ids);
                  void commit(next);
                } catch (error) {
                  Alert.alert(t("확인", "Check"), errorMessage(error));
                }
              }}
            />
            <Button
              secondary
              label={t("나중에 기록", "Record a past episode")}
              testID="record-later"
              disabled={busy}
              onPress={() => {
                const now = clock.now();
                setEpisode({
                  id: ids.next(),
                  createdAt: now,
                  updatedAt: now,
                  date: today,
                  timeZone: clock.timeZone(),
                  start: unknownTime(),
                  end: unknownTime(),
                  recovery: unknownTime(),
                  symptoms: [],
                  ear: "unknown",
                  impact: "unknown",
                  note: "",
                  treatment: "",
                  active: false,
                });
              }}
            />
          </Card>
        )}
        <Card>
          <Heading small>{t("오늘 상태", "Today’s status")}</Heading>
          <Copy>
            {day
              ? day.status === "none"
                ? t("증상 없음 확인", "Confirmed no symptoms")
                : t("증상 있었음", "Symptoms occurred")
              : t("아직 미기록", "Not recorded yet")}
          </Copy>
          <Button
            secondary
            label={t("하루 상태 남기기", "Daily check-in")}
            onPress={() => {
              setDayDate(today);
              setDayEditor(true);
            }}
          />
          <Button
            secondary
            label={t("생활 습관 확인", "Check my habits")}
            onPress={() => changeTab("habits")}
          />
        </Card>
        <Card>
          <Heading small>
            {t("전정재활 운동", "Vestibular rehabilitation")}
          </Heading>
          <Copy>
            {t(
              "고정 표적과 타이머로 시선 안정화를 연습하고 수행을 기록합니다.",
              "Practice gaze stability with a fixed target and timer, and record your sessions.",
            )}
          </Copy>
          <Button
            secondary
            label={t("운동 프로그램", "Exercise program")}
            onPress={() => changeTab("rehab")}
          />
        </Card>
        <Card>
          <Heading small>
            {t("다음 진료에 가져가세요", "Bring it to your next visit")}
          </Heading>
          <Copy>
            {t(
              "기록과 질문을 한 장으로 정리합니다.",
              "Prepare a summary of your records and questions.",
            )}
          </Copy>
          <Button
            secondary
            label={t("진료 준비", "Prepare for a visit")}
            onPress={() => changeTab("visit")}
          />
        </Card>
      </>
    );
  } else if (tab === "history") {
    const today = localDate(clock.now(), clock.timeZone());
    content = (
      <>
        <Heading>{t("내 기록", "My records")}</Heading>
        <Copy muted>
          {t(
            "빈 날은 증상이 없던 날이 아니라, 알 수 없는 날입니다.",
            "A gap means the day is unknown, not symptom-free.",
          )}
        </Copy>
        <Button
          secondary
          label={t("과거 하루 상태 입력", "Add a past daily status")}
          onPress={() => setDayEditor(true)}
        />
        {Array.from({ length: 28 }, (_, i) => shiftDate(today, -i)).map(
          (date) => {
            const day = journal.days.find((d) => d.date === date),
              episodes = journal.episodes.filter((e) => e.date === date);
            return (
              <Card key={date}>
                <Heading small>{date}</Heading>
                <Copy>
                  {day
                    ? day.status === "none"
                      ? t("증상 없음 확인", "Confirmed no symptoms")
                      : t("증상 있었음", "Symptoms occurred")
                    : t("미기록", "Unrecorded")}
                </Copy>
                <Button
                  secondary
                  label={t("하루 상태 수정", "Edit daily status")}
                  onPress={() => {
                    setDayDate(date);
                    setDayEditor(true);
                  }}
                />
                {episodes.map((e) => (
                  <Button
                    secondary
                    key={e.id}
                    label={`${timeName(e.start, e.timeZone, journal.settings.language)} · ${e.symptoms.map((s) => symptomName(s, t)).join(", ") || t("발작 기록", "Episode")}`}
                    onPress={() => setEpisode(e)}
                  />
                ))}
              </Card>
            );
          },
        )}
        <Heading small>{t("이전 발작 기록", "Earlier episodes")}</Heading>
        {journal.episodes
          .filter((e) => e.date < shiftDate(today, -27))
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => (
            <Button
              key={e.id}
              secondary
              label={`${e.date} · ${timeName(e.start, e.timeZone, journal.settings.language)}`}
              onPress={() => setEpisode(e)}
            />
          ))}
      </>
    );
  } else if (tab === "rehab")
    content = (
      <RehabScreen
        {...props!}
        onBack={() => changeTab("home")}
        onHelp={() => changeTab("help")}
        onTargetActive={setRehabTargetActive}
        onScrollToTop={() =>
          scroll.current?.scrollTo({ y: 0, animated: false })
        }
      />
    );
  else if (tab === "habits")
    content = (
      <HabitScreen {...props!} onOpenRehab={() => changeTab("rehab")} />
    );
  else if (tab === "visit") content = <VisitScreen {...props!} />;
  else if (tab === "settings")
    content = (
      <SettingsScreen
        {...props!}
        repository={repository}
        onAdsChanged={() => {
          setAdsReady(false);
          setBannerFailed(false);
          consentRequested.current = false;
          setConsentRevision((value) => value + 1);
        }}
        onErase={() =>
          void run(async () => {
            await reminders.clear();
            await repository.erase();
            setJournal(emptyJournal(journal.settings.language));
            setEpisode(null);
            setDayEditor(false);
            setTab("home");
            setAdsReady(false);
            consentRequested.current = false;
          })
        }
      />
    );
  else content = null;
  const showBanner =
    journal?.settings.onboarded &&
    adsReady &&
    !fieldFocused &&
    !formActive &&
    !bannerFailed &&
    !active &&
    !episode &&
    !dayEditor &&
    !busy &&
    foreground &&
    ["home", "history", "habits", "settings"].includes(tab);
  const bannerId =
    __DEV__ || !Constants.expoConfig?.extra?.production
      ? TestIds.BANNER
      : Platform.OS === "ios"
        ? admob.ios.bannerId
        : admob.android.bannerId;
  return (
    <PaletteContext.Provider value={palette}>
      <InputFocusContext.Provider value={setFieldFocused}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
          <StatusBar
            barStyle={palette === dark ? "light-content" : "dark-content"}
          />
          {journal?.settings.onboarded && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 6,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: palette.accent,
                  flexShrink: 1,
                }}
              >
                MENIERE JOURNAL
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("도움", "Help")}
                onPress={() => changeTab("help")}
                style={{ padding: 12, minHeight: 48 }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    color: palette.ink,
                    fontWeight: "600",
                  }}
                >
                  {t("도움", "Help")}
                </Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            ref={scroll}
            scrollEnabled={!rehabTargetActive}
            key={`${tab}-${episode?.id ?? ""}-${dayEditor}-${journal?.settings.onboarded}`}
            contentContainerStyle={layout.content}
            keyboardShouldPersistTaps="handled"
            style={layout.grow}
          >
            {content}
          </ScrollView>
          {busy && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: palette.muted,
                fontSize: 18,
                paddingHorizontal: 20,
                paddingVertical: 8,
              }}
            >
              {t("저장·처리 중", "Saving / processing")}
            </Text>
          )}
          {showBanner && bannerId && (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 8,
                borderTopWidth: 1,
                borderColor: palette.line,
              }}
            >
              <Text style={{ fontSize: 12, color: palette.muted }}>
                {t("광고", "Advertisement")}
              </Text>
              <BannerAd
                unitId={bannerId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                onAdFailedToLoad={() => setBannerFailed(true)}
              />
            </View>
          )}
          {journal?.settings.onboarded && !(tab === "rehab" && formActive) && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                borderTopWidth: 1,
                borderColor: palette.line,
                padding: 4,
              }}
            >
              {(
                ["home", "history", "habits", "visit", "settings"] as const
              ).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === value }}
                  disabled={busy || (tab === "rehab" && formActive)}
                  onPress={() => changeTab(value)}
                  style={{
                    flexGrow: 1,
                    flexBasis: "18%",
                    minHeight: 54,
                    paddingVertical: 14,
                    paddingHorizontal: 5,
                    backgroundColor: tab === value ? palette.tint : palette.bg,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: tab === value ? "700" : "400",
                      color: palette.ink,
                      textAlign: "center",
                    }}
                  >
                    {
                      {
                        home: t("오늘", "Today"),
                        history: t("기록", "Records"),
                        habits: t("생활", "Habits"),
                        visit: t("진료", "Visit"),
                        settings: t("설정", "Settings"),
                      }[value]
                    }
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </SafeAreaView>
      </InputFocusContext.Provider>
    </PaletteContext.Provider>
  );
}

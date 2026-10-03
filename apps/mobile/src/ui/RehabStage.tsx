import React from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import type { ExerciseProgram, RehabKind } from "@meniere/product-core";
import { Button, usePalette } from "./components";
import { GazeTarget, RestPicture } from "./RehabVisual";
import { rehabName } from "./rehab-content";
import type { translator } from "./labels";

function Awake() {
  useKeepAwake("rehab-exercise");
  return null;
}

export function RehabStage({
  kind,
  program,
  leadIn,
  busy,
  t,
  onPause,
  onContinue,
  onStop,
  onHelp,
}: {
  kind: RehabKind;
  program: ExerciseProgram;
  leadIn: number | null;
  busy: boolean;
  t: ReturnType<typeof translator>;
  onPause: () => void;
  onContinue: () => void;
  onStop: () => void;
  onHelp: () => void;
}) {
  const p = usePalette();
  const { height, width } = useWindowDimensions();
  const preparing = leadIn !== null;
  const exercising = program.phase === "exercise";
  const resting = program.phase === "rest";
  const gaze = kind !== "balance_supported";
  const targetSize = Math.min(width * 0.46, height * 0.25, 230);
  return (
    <Modal
      visible
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onPause}
    >
      {(exercising || preparing) && <Awake />}
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  maxFontSizeMultiplier={1.5}
                  style={{ color: p.muted, fontSize: 16 }}
                >
                  {rehabName(kind, t)}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.5}
                  style={{
                    color: p.ink,
                    fontWeight: "600",
                    fontSize: 19,
                    marginTop: 6,
                  }}
                >
                  {t("회차", "Round")}{" "}
                  {Math.min(program.completedRounds + 1, program.plannedRounds)}{" "}
                  / {program.plannedRounds}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("중단하고 도움", "Stop and get help")}
                onPress={onHelp}
                style={{ padding: 12, minHeight: 48 }}
              >
                <Text
                  maxFontSizeMultiplier={1.5}
                  style={{ color: p.ink, fontSize: 18, fontWeight: "600" }}
                >
                  {t("도움", "Help")}
                </Text>
              </Pressable>
            </View>
            {/* The target has one fixed position and size for the whole round. */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: "27%",
                bottom: "37%",
                left: 0,
                right: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {preparing ? (
                <>
                  <Text
                    accessibilityLabel={t("시작 준비", "Get ready")}
                    style={{ fontSize: 24, color: p.muted }}
                  >
                    {t("거치대에 놓고 준비", "Place in holder & get ready")}
                  </Text>
                  <Text
                    accessibilityLabel={String(leadIn)}
                    style={{
                      color: p.ink,
                      fontSize: targetSize * 0.6,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {leadIn}
                  </Text>
                </>
              ) : exercising && gaze ? (
                <GazeTarget
                  size={targetSize}
                  label={t("고정 시선 표적 X", "Stationary gaze target X")}
                />
              ) : (
                <View
                  style={{
                    width: Math.min(260, width * 0.7),
                    height: height * 0.23,
                  }}
                >
                  <RestPicture standing={exercising && !gaze} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ gap: 8 }}>
              <Text
                maxFontSizeMultiplier={1.4}
                accessibilityLiveRegion={exercising ? "none" : "polite"}
                style={{
                  color: p.ink,
                  textAlign: "center",
                  fontSize: 26,
                  fontWeight: "600",
                }}
              >
                {preparing
                  ? t("곧 시작합니다", "Starting shortly")
                  : exercising
                    ? `${program.remainingSeconds} ${t("초", "sec")}`
                    : resting
                      ? t(
                          "회차 완료 · 앉아서 쉬세요",
                          "Round complete · sit & rest",
                        )
                      : t("일시정지됨", "Paused")}
              </Text>
              <Text
                maxFontSizeMultiplier={1.4}
                style={{
                  color: p.muted,
                  textAlign: "center",
                  fontSize: 18,
                  lineHeight: 26,
                }}
              >
                {preparing
                  ? t(
                      "시작되면 정한 동작을 수행하세요.",
                      "Begin your agreed movement when ready.",
                    )
                  : exercising
                    ? kind === "gaze_horizontal"
                      ? t(
                          "눈은 X에 · 머리는 좌우로",
                          "Eyes on X · turn head left & right",
                        )
                      : kind === "gaze_vertical"
                        ? t(
                            "눈은 X에 · 머리는 위아래로",
                            "Eyes on X · nod head up & down",
                          )
                        : t(
                            "눈은 뜨고 · 고정된 지지물을 잡아요",
                            "Eyes open · hold fixed support",
                          )
                    : resting
                      ? t(
                          "편해진 뒤 직접 다음 회차를 시작하세요.",
                          "Start the next round when comfortable.",
                        )
                      : t(
                          "시간은 멈춰 있어요. 안전할 때 계속하세요.",
                          "Time is stopped. Resume when safe.",
                        )}
              </Text>
              {exercising || preparing ? (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      label={t("일시정지", "Pause")}
                      onPress={onPause}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      danger
                      secondary
                      label={t("운동 중단", "Stop exercise")}
                      onPress={onStop}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Button
                    disabled={busy}
                    label={
                      resting
                        ? t(
                            "편해졌어요 · 다음 회차",
                            "Comfortable · next round",
                          )
                        : t("안전해요 · 계속", "Safe to resume")
                    }
                    onPress={onContinue}
                  />
                  <Button
                    danger
                    secondary
                    label={t("운동 중단", "Stop exercise")}
                    onPress={onStop}
                  />
                </>
              )}
              <Text
                maxFontSizeMultiplier={1.4}
                style={{
                  color: p.muted,
                  fontSize: 14,
                  lineHeight: 21,
                  textAlign: "center",
                }}
              >
                {t(
                  "심한 어지럼·구역, 목 통증이 생기면 중단하세요.",
                  "Stop for strong dizziness, nausea or neck pain.",
                )}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

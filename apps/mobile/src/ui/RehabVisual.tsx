import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import type { RehabKind } from "@meniere/product-core";
import { Button, Copy, usePalette } from "./components";
import type { translator } from "./labels";

type Translate = ReturnType<typeof translator>;

/** Original diagrams: the illustrated head moves; the gaze target does not. */
export function RehabDemo({ kind, t }: { kind: RehabKind; t: Translate }) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const movement = useRef(new Animated.Value(0)).current;
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const app = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    movement.setValue(0);
    if (!playing || reduced || !foreground || kind === "balance_supported")
      return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(movement, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(movement, {
          toValue: -1,
          duration: 2800,
          useNativeDriver: true,
        }),
        Animated.timing(movement, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [kind, playing, reduced, foreground, movement]);
  const horizontal = kind === "gaze_horizontal";
  return (
    <>
      <View
        accessible
        accessibilityLabel={
          kind === "balance_supported"
            ? t(
                "그림: 눈을 뜨고 고정된 난간을 잡고 서 있는 사람",
                "Diagram: standing with eyes open, holding a fixed rail",
              )
            : horizontal
              ? t(
                  "시범: 휴대폰 X와 시선은 고정, 머리만 좌우로 회전 · 위에서 본 모습",
                  "Demo: fixed phone X and gaze, head turns left and right · top view",
                )
              : t(
                  "시범: 휴대폰 X와 시선은 고정, 머리만 위아래로 끄덕임 · 옆에서 본 모습",
                  "Demo: fixed phone X and gaze, head nods up and down · side view",
                )
        }
        style={{
          alignItems: "center",
          backgroundColor: p.tint,
          borderRadius: 16,
          paddingVertical: 16,
        }}
      >
        {kind !== "balance_supported" && (
          <Text style={{ color: p.muted, fontSize: 14, marginBottom: 8 }}>
            {horizontal
              ? t("위에서 본 시범", "Demonstration · top view")
              : t("옆에서 본 시범", "Demonstration · side view")}
          </Text>
        )}
        <View
          style={{
            width: 300,
            height: 230,
            transform: [{ scale: Math.min(1, (width - 104) / 300) }],
          }}
        >
          {kind === "balance_supported" ? (
            <RestPicture standing />
          ) : (
            <>
              <Svg width={300} height={230} viewBox="0 0 300 230">
                {horizontal ? (
                  <>
                    <Rect
                      x={128}
                      y={5}
                      width={44}
                      height={66}
                      rx={8}
                      fill={p.card}
                      stroke={p.ink}
                      strokeWidth={3}
                    />
                    <Path
                      d="M140 24 L160 44 M160 24 L140 44 M127 78 H173 M150 71 V78"
                      stroke={p.ink}
                      strokeWidth={3}
                    />
                    <Path
                      d="M100 202 Q150 172 200 202 V223 H100 Z"
                      fill={p.accent}
                    />
                    <Path
                      d="M94 124 Q65 150 94 176 M85 123 L96 122 L94 135 M85 176 L96 178 L94 165 M206 124 Q235 150 206 176 M215 123 L204 122 L206 135 M215 176 L204 178 L206 165"
                      fill="none"
                      stroke={p.accent}
                      strokeWidth={3}
                    />
                  </>
                ) : (
                  <>
                    <Rect
                      x={248}
                      y={100}
                      width={40}
                      height={65}
                      rx={8}
                      fill={p.card}
                      stroke={p.ink}
                      strokeWidth={3}
                    />
                    <Path
                      d="M258 118 L278 138 M278 118 L258 138 M244 179 H292 M268 165 V179"
                      stroke={p.ink}
                      strokeWidth={3}
                    />
                    <Path
                      d="M105 190 Q133 181 154 199 L166 227 H101 Z"
                      fill={p.accent}
                    />
                    <Path
                      d="M178 97 Q203 130 178 163 M171 100 L178 90 L187 99 M171 160 L178 170 L187 161"
                      fill="none"
                      stroke={p.accent}
                      strokeWidth={3}
                    />
                  </>
                )}
              </Svg>
              <Animated.View
                style={{
                  position: "absolute",
                  left: horizontal ? 105 : 86,
                  top: horizontal ? 103 : 94,
                  width: 90,
                  height: 90,
                  transform: [
                    {
                      rotate: movement.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: horizontal
                          ? ["-18deg", "0deg", "18deg"]
                          : ["-10deg", "0deg", "10deg"],
                      }),
                    },
                  ],
                }}
              >
                <Svg width={90} height={90} viewBox="0 0 90 90">
                  {horizontal ? (
                    <>
                      <Ellipse
                        cx={45}
                        cy={47}
                        rx={33}
                        ry={35}
                        fill={p.card}
                        stroke={p.ink}
                        strokeWidth={3}
                      />
                      <Path
                        d="M39 17 L45 5 L51 17 M11 40 V56 M79 40 V56"
                        fill="none"
                        stroke={p.ink}
                        strokeWidth={3}
                      />
                    </>
                  ) : (
                    <Path
                      d="M24 74 Q7 55 17 26 Q24 7 44 10 Q66 11 70 28 L80 42 L70 47 V63 Q62 78 44 75 V88 H24 Z"
                      fill={p.card}
                      stroke={p.ink}
                      strokeWidth={3}
                    />
                  )}
                </Svg>
              </Animated.View>
              <Svg
                width={300}
                height={230}
                viewBox="0 0 300 230"
                style={{ position: "absolute" }}
              >
                {horizontal ? (
                  <>
                    <Path
                      d="M140 145 L150 73 L160 145"
                      stroke={p.accent}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="none"
                    />
                    <Circle cx={140} cy={145} r={4} fill={p.ink} />
                    <Circle cx={160} cy={145} r={4} fill={p.ink} />
                  </>
                ) : (
                  <>
                    <Line
                      x1={145}
                      y1={128}
                      x2={245}
                      y2={128}
                      stroke={p.accent}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Circle cx={145} cy={128} r={4} fill={p.ink} />
                  </>
                )}
              </Svg>
            </>
          )}
        </View>
        <Text
          style={{
            color: p.ink,
            fontSize: 18,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {kind === "balance_supported"
            ? t("고정된 지지물 · 눈은 뜨고", "Fixed support · eyes open")
            : t(
                "표적과 시선은 고정 · 머리만 움직여요",
                "Target and gaze stay fixed · move your head",
              )}
        </Text>
      </View>
      {kind !== "balance_supported" && (
        <>
          {!reduced && (
            <Button
              secondary
              label={
                playing
                  ? t("시범 멈추기", "Pause demonstration")
                  : t("시범 재생", "Play demonstration")
              }
              onPress={() => setPlaying(!playing)}
            />
          )}
          <Copy muted>
            {t(
              "동작을 보여주는 그림입니다. 실제 속도와 목 움직임 범위는 의료진과 정한 대로 따르세요.",
              "This diagram shows the movement. Follow the speed and neck range agreed with your clinician.",
            )}
          </Copy>
        </>
      )}
    </>
  );
}

export function RestPicture({ standing = false }: { standing?: boolean }) {
  const p = usePalette();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 230" accessible={false}>
      <Circle
        cx={120}
        cy={40}
        r={21}
        fill={p.card}
        stroke={p.ink}
        strokeWidth={3}
      />
      <Path
        d={
          standing
            ? "M112 65 L104 125 H137 L140 70 Z"
            : "M112 65 L104 128 H144 L137 70 Z"
        }
        fill={p.accent}
      />
      <Path
        d={
          standing
            ? "M140 80 L177 104 L207 89 M113 132 L108 207 H132 M137 132 L148 207 H172"
            : "M140 80 L155 110 L193 111 M116 134 L164 139 L177 203 H204"
        }
        fill="none"
        stroke={p.ink}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {standing ? (
        <Path
          d="M175 83 H275 M190 83 V213 M260 83 V213"
          fill="none"
          stroke={p.muted}
          strokeWidth={6}
        />
      ) : (
        <Path
          d="M90 88 V154 H155 M99 154 V213 M150 154 V213"
          fill="none"
          stroke={p.muted}
          strokeWidth={6}
        />
      )}
      <Path d="M70 216 H282" stroke={p.line} strokeWidth={3} />
    </Svg>
  );
}

export function GazeTarget({ size, label }: { size: number; label: string }) {
  const p = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={label}
      testID="gaze-target"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
        <Path
          d="M24 24 L76 76 M76 24 L24 76"
          stroke={p.ink}
          strokeWidth={9}
          strokeLinecap="square"
        />
      </Svg>
    </View>
  );
}

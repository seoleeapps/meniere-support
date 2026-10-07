import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { symptoms, type Symptom } from "@meniere/product-core";
import { Copy, Heading, usePalette } from "./components";
import { symptomName, type Translate } from "./labels";

function SymptomIcon({ symptom, color }: { symptom: Symptom; color: string }) {
  const ear =
    "M10 24c4 0 3-5 6-7 4-3 5-5 5-9a9 9 0 0 0-18 0M8 9a4 4 0 0 1 8 0c0 3-4 3-4 6";
  return (
    <Svg width={36} height={36} viewBox="0 0 32 32" accessible={false}>
      <G
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {symptom === "vertigo" ? (
          <>
            <Path d="M7 11a10 10 0 0 1 18-1M25 5v5h-5M25 21a10 10 0 0 1-18 1M7 27v-5h5" />
            <Circle cx={16} cy={16} r={3} />
          </>
        ) : symptom === "tinnitus" ? (
          <>
            <Path d={ear} />
            <Path d="m25 10 3 2-3 2 3 2-3 2" />
          </>
        ) : symptom === "fullness" ? (
          <>
            <Path d={ear} />
            <Circle cx={25} cy={18} r={4} fill={color} stroke="none" />
          </>
        ) : symptom === "hearing" ? (
          <>
            <Path d={ear} />
            <Path d="M24 12c2 2 2 6 0 8M28 9c4 4 4 10 0 14" />
          </>
        ) : symptom === "nausea" ? (
          <>
            <Path d="M14 4v8c-4 1-7 3-7 7 0 6 5 9 11 8 6-1 8-6 6-11-1-3-4-4-6-3V4" />
            <Path d="m11 20 3-2 3 4 3-2" />
          </>
        ) : (
          <>
            <Path d="M5 25V13a8 8 0 0 1 16 0l3 4h-5v5h-6M21 25h7M24 21l2 2M28 18l2 3" />
            <Circle cx={17} cy={12} r={1} fill={color} stroke="none" />
          </>
        )}
      </G>
    </Svg>
  );
}

export function SymptomChoices({
  selected,
  onChange,
  disabled,
  t,
}: {
  selected: readonly Symptom[];
  onChange: (symptom: Symptom) => void;
  disabled: boolean;
  t: Translate;
}) {
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width < 360 || fontScale >= 1.3;
  return (
    <View style={{ marginVertical: 8, gap: 8 }}>
      <Heading small>
        {t("어떤 증상이 있었나요?", "Which symptoms did you have?")}
      </Heading>
      <Copy muted>
        {t(
          "해당하는 증상을 모두 선택하세요. 선택 사항입니다.",
          "Select all that apply. This is optional.",
        )}
      </Copy>
      <Copy>
        {t(`${selected.length}개 선택`, `${selected.length} selected`)}
      </Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {symptoms.map((symptom) => {
          const checked = selected.includes(symptom);
          const color = checked ? p.bg : p.ink;
          return (
            <Pressable
              key={symptom}
              testID={`symptom-${symptom}`}
              accessibilityRole="checkbox"
              accessibilityLabel={symptomName(symptom, t)}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => onChange(symptom)}
              style={({ pressed }) => ({
                flexBasis: singleColumn ? "100%" : "47%",
                flexGrow: 1,
                minHeight: 116,
                padding: 16,
                gap: 12,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: checked ? p.accent : p.line,
                backgroundColor: checked ? p.accent : p.card,
                opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <SymptomIcon symptom={symptom} color={color} />
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: color,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked && (
                    <Svg
                      width={18}
                      height={18}
                      viewBox="0 0 18 18"
                      accessible={false}
                    >
                      <Path
                        d="m3 9 4 4 8-9"
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </View>
              </View>
              <Text style={{ color, fontSize: 18, fontWeight: "600" }}>
                {symptomName(symptom, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

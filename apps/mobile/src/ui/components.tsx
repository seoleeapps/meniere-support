import React, { createContext, useContext } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
export const light = {
  bg: "#F4F7F5",
  card: "#FFFFFF",
  ink: "#163F37",
  muted: "#536963",
  accent: "#236D60",
  tint: "#E4F0EC",
  line: "#CCDCD5",
  danger: "#A33438",
};
export const dark = {
  bg: "#102623",
  card: "#193832",
  ink: "#F0F7F3",
  muted: "#B3CBC2",
  accent: "#A0DECA",
  tint: "#264D42",
  line: "#43645A",
  danger: "#FFB6B8",
};
export type Palette = typeof light;
export const PaletteContext = createContext<Palette>(light);
export const usePalette = () => useContext(PaletteContext);
export const InputFocusContext = createContext<(focused: boolean) => void>(
  () => {},
);
export function Heading({
  children,
  small = false,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  const p = usePalette();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: small ? 22 : 30,
        fontWeight: "700",
        color: p.ink,
        marginVertical: 10,
      }}
    >
      {children}
    </Text>
  );
}
export function Copy({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  const p = usePalette();
  return (
    <Text
      style={{
        fontSize: 18,
        lineHeight: 28,
        color: muted ? p.muted : p.ink,
        marginVertical: 4,
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={{
        backgroundColor: p.card,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: p.line,
        gap: 8,
        marginVertical: 8,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        padding: 16,
        minHeight: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: danger ? p.danger : p.accent,
        backgroundColor: secondary ? "transparent" : p.accent,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        marginVertical: 3,
      })}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: danger ? p.danger : secondary ? p.accent : p.bg,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const p = usePalette();
  const setFocused = useContext(InputFocusContext);
  return (
    <View style={{ gap: 6, marginVertical: 8 }}>
      <Text style={{ fontSize: 18, color: p.ink }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.muted}
        maxLength={20000}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          {
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.card,
            color: p.ink,
            borderRadius: 12,
            minHeight: 54,
            padding: 14,
            fontSize: 18,
            textAlignVertical: "top",
          },
          props.multiline && { minHeight: 110 },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices<T extends string>({
  label,
  values,
  selected,
  onChange,
  name,
  multiple = false,
}: {
  label: string;
  values: readonly T[];
  selected: readonly T[];
  onChange: (value: T) => void;
  name: (value: T) => string;
  multiple?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={{ marginVertical: 8, gap: 8 }}>
      <Copy>{label}</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {values.map((value) => {
          const checked = selected.includes(value);
          return (
            <Pressable
              key={value}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={name(value)}
              accessibilityState={{ checked }}
              onPress={() => onChange(value)}
              style={{
                minHeight: 50,
                padding: 12,
                borderRadius: 12,
                backgroundColor: checked ? p.tint : p.card,
                borderWidth: checked ? 2 : 1,
                borderColor: checked ? p.accent : p.line,
              }}
            >
              <Text style={{ fontSize: 18, color: p.ink }}>
                {checked ? "✓ " : ""}
                {name(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export const layout = StyleSheet.create({
  grow: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

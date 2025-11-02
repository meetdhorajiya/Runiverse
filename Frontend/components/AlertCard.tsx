import React, { ReactNode, useMemo } from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const DEFAULT_ICONS = {
  info: "information-circle-outline",
  success: "checkmark-circle-outline",
  warning: "warning-outline",
  error: "alert-circle-outline",
} as const;

type AlertVariant = keyof typeof DEFAULT_ICONS;

interface AlertCardProps {
  type?: AlertVariant;
  title?: string;
  message?: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const withAlpha = (hex: string, alpha: string) => {
  if (typeof hex !== "string") return hex;
  if (!hex.startsWith("#")) return hex;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (hex.length === 7) {
    return `${hex}${alpha}`;
  }
  return hex;
};

const AlertCard = ({
  type = "info",
  title,
  message,
  icon,
  leading,
  trailing,
  style,
  testID,
}: AlertCardProps) => {
  const { colors, isDark } = useTheme();

  const palette = useMemo(() => {
    const baseColor = colors.status[type];
    return {
      background: withAlpha(baseColor, isDark ? "26" : "12"),
      border: withAlpha(baseColor, isDark ? "40" : "33"),
      iconBackground: withAlpha(baseColor, isDark ? "33" : "1A"),
      accent: baseColor,
      title: colors.text.primary,
      message: colors.text.secondary,
    };
  }, [colors.status, colors.text.primary, colors.text.secondary, isDark, type]);

  const resolvedIcon = icon ?? DEFAULT_ICONS[type];

  return (
    <View
      className="flex-row items-start rounded-2xl border px-4 py-3"
      style={[{ backgroundColor: palette.background, borderColor: palette.border }, style]}
      testID={testID}
    >
      {leading ? (
        <View className="mr-3 mt-0.5">{leading}</View>
      ) : (
        <View
          className="mr-3 rounded-2xl p-2"
          style={{ backgroundColor: palette.iconBackground }}
        >
          <Ionicons name={resolvedIcon} size={20} color={palette.accent} />
        </View>
      )}
      <View className="flex-1">
        {title ? (
          <Text className="text-base font-semibold" style={{ color: palette.title }}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text className={`text-sm ${title ? "mt-1" : ""}`} style={{ color: palette.message }}>
            {message}
          </Text>
        ) : null}
      </View>
      {trailing ? <View className="ml-3">{trailing}</View> : null}
    </View>
  );
};

export default AlertCard;

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { useColorScheme } from "nativewind";

const THEME_STORAGE_KEY = "runiverse:theme";

const themePalettes = {
  light: {
    background: {
      primary: "#FFFFFF",
      secondary: "#F8F9FA",
      tertiary: "#F1F3F5",
      elevated: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#6B7280",
      tertiary: "#9CA3AF",
      disabled: "#D1D5DB",
    },
    border: {
      light: "#E5E7EB",
      medium: "#D1D5DB",
      dark: "#9CA3AF",
    },
    accent: {
      primary: "#4B5563",
      secondary: "#6B7280",
      hover: "#374151",
    },
    status: {
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    gradients: {
      oceanBreeze: ["#E0F2FE", "#BAE6FD"],
      sunsetGlow: ["#FEF3C7", "#FDE68A", "#FCA5A5"],
      purpleDream: ["#F3E8FF", "#E9D5FF"],
      mintFresh: ["#DCFCE7", "#BBF7D0"],
      peachySoft: ["#FEE2E2", "#FECACA", "#FED7AA"],
      skyBlue: ["#DBEAFE", "#BFDBFE"],
      roseGarden: ["#FCE7F3", "#FBCFE8"],
      lemonLime: ["#FEF9C3", "#D9F99D"],
      lavenderFields: ["#EDE9FE", "#DDD6FE"],
      coralReef: ["#FFEDD5", "#FED7AA", "#FECACA"],
      tealWave: ["#CCFBF1", "#99F6E4"],
      berryBlend: ["#FCE7F3", "#F9A8D4", "#E9D5FF"],
      goldenHour: ["#FEF3C7", "#FDE047", "#FBBF24"],
      arcticBlue: ["#E0F2FE", "#BAE6FD", "#C7D2FE"],
      springMeadow: ["#ECFCCB", "#D9F99D", "#BEF264"],
      rainbowSoft: ["#FEF3C7", "#DBEAFE", "#E9D5FF", "#FBCFE8", "#FED7AA"],
      tropicalParadise: ["#CCFBF1", "#BAE6FD", "#FDE68A"],
      cottonCandy: ["#FCE7F3", "#E9D5FF", "#DBEAFE"],
      sunriseDelight: ["#FEE2E2", "#FECACA", "#FED7AA", "#FEF3C7"],
      northernLights: ["#DBEAFE", "#C7D2FE", "#DDD6FE", "#FBCFE8"],
      summerVibes: ["#FEF9C3", "#D9F99D", "#99F6E4", "#BAE6FD"],
    },
    overlay: {
      scrim: "rgba(10, 10, 10, 0.55)",
      subtle: "rgba(248, 249, 250, 0.85)",
    },
  },
  dark: {
    background: {
      primary: "#0A0A0A",
      secondary: "#141414",
      tertiary: "#1F1F1F",
      elevated: "#262626",
    },
    text: {
      primary: "#F5F5F5",
      secondary: "#A3A3A3",
      tertiary: "#737373",
      disabled: "#525252",
    },
    border: {
      light: "#262626",
      medium: "#404040",
      dark: "#525252",
    },
    accent: {
      primary: "#A3A3A3",
      secondary: "#737373",
      hover: "#D4D4D4",
    },
    status: {
      success: "#22C55E",
      warning: "#FBB040",
      error: "#F87171",
      info: "#60A5FA",
    },
    gradients: {
      oceanBreeze: ["#0C4A6E", "#075985"],
      sunsetGlow: ["#713F12", "#92400E", "#991B1B"],
      purpleDream: ["#581C87", "#6B21A8"],
      mintFresh: ["#14532D", "#166534"],
      peachySoft: ["#991B1B", "#9A3412", "#92400E"],
      skyBlue: ["#1E3A8A", "#1E40AF"],
      roseGarden: ["#831843", "#9F1239"],
      lemonLime: ["#713F12", "#3F6212"],
      lavenderFields: ["#4C1D95", "#5B21B6"],
      coralReef: ["#7C2D12", "#9A3412", "#991B1B"],
      tealWave: ["#134E4A", "#115E59"],
      berryBlend: ["#831843", "#BE185D", "#6B21A8"],
      goldenHour: ["#713F12", "#854D0E", "#A16207"],
      arcticBlue: ["#0C4A6E", "#075985", "#3730A3"],
      springMeadow: ["#365314", "#3F6212", "#4D7C0F"],
      rainbowSoft: ["#713F12", "#1E3A8A", "#581C87", "#831843", "#92400E"],
      tropicalParadise: ["#134E4A", "#075985", "#854D0E"],
      cottonCandy: ["#831843", "#6B21A8", "#1E40AF"],
      sunriseDelight: ["#991B1B", "#9A3412", "#92400E", "#713F12"],
      northernLights: ["#1E3A8A", "#3730A3", "#5B21B6", "#9F1239"],
      summerVibes: ["#713F12", "#3F6212", "#115E59", "#075985"],
    },
    overlay: {
      scrim: "rgba(0, 0, 0, 0.65)",
      subtle: "rgba(20, 20, 20, 0.75)",
    },
  },
} as const;

type ThemeMode = keyof typeof themePalettes;
type ThemePalette = (typeof themePalettes)[ThemeMode];

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemePalette;
  isReady: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = Appearance.getColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(
    systemScheme === "dark" ? "dark" : "light"
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    const hydrateTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === "light" || storedTheme === "dark") {
          if (isMounted) {
            setThemeState(storedTheme);
          }
        }
      } catch (error) {
        console.log("Theme hydration failed", error);
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    AsyncStorage.setItem(THEME_STORAGE_KEY, theme).catch((error) => {
      console.log("Theme persistence failed", error);
    });
  }, [theme, hasHydrated]);

  const applyTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDark: theme === "dark",
      colors: themePalettes[theme],
      isReady: hasHydrated,
      toggleTheme,
      setTheme: applyTheme,
    }),
    [theme, hasHydrated, toggleTheme, applyTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
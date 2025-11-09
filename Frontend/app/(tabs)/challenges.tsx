import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "@/store/useStore";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProgressAnimation } from "@/hooks/useProgressAnimation";
import { User } from "@/store/types";
import { authService } from "@/services/AuthService";

interface Task {
  _id: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'run' | 'walk' | 'capture' | 'streak';
  target: number;
  completed: boolean;
  createdAt: string;
  expiresAt?: string;
}
const API_BASE_URL = "https://runiverse.onrender.com/api";

const PROGRESS_STORAGE_KEY = "challenge-progress-map-v1";

interface ProgressEntry {
  joined: boolean;
  baselineRaw: number;
  metric: Task["type"];
  progressValue: number;
  percent: number;
  completed: boolean;
  completionSynced: boolean;
}

interface MetricConfig {
  unitLabel: string;
  selector: (user: User | null) => number;
  computeDelta: (current: number, baseline: number) => number;
  formatValue: (value: number) => string;
  formatTarget: (target: number) => string;
  canTrack: (user: User | null) => boolean;
}

const trimTrailingZeros = (value: string) => value.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.$/, "");

const distanceFormatter = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const absolute = Math.max(0, value);
  if (absolute >= 10) return trimTrailingZeros(absolute.toFixed(1));
  if (absolute >= 1) return trimTrailingZeros(absolute.toFixed(2));
  return trimTrailingZeros(absolute.toFixed(3));
};

const integerFormatter = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Math.max(0, Math.round(value)).toString();
};

const METRIC_CONFIG: Record<Task["type"], MetricConfig> = {
  run: {
    unitLabel: "km",
    selector: (user) => (typeof user?.distance === "number" ? user.distance : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, (safeCurrent - safeBaseline) / 1000);
    },
    formatValue: distanceFormatter,
    formatTarget: distanceFormatter,
    canTrack: (user) => typeof user?.distance === "number",
  },
  walk: {
    unitLabel: "km",
    selector: (user) => (typeof user?.distance === "number" ? user.distance : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, (safeCurrent - safeBaseline) / 1000);
    },
    formatValue: distanceFormatter,
    formatTarget: distanceFormatter,
    canTrack: (user) => typeof user?.distance === "number",
  },
  capture: {
    unitLabel: "territories",
    selector: (user) => (typeof user?.territories === "number" ? user.territories : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, safeCurrent - safeBaseline);
    },
    formatValue: integerFormatter,
    formatTarget: integerFormatter,
    canTrack: (user) => typeof user?.territories === "number",
  },
  streak: {
    unitLabel: "days",
    selector: (user) => (typeof user?.streak === "number" ? user.streak : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, safeCurrent - safeBaseline);
    },
    formatValue: integerFormatter,
    formatTarget: integerFormatter,
    canTrack: (user) => typeof user?.streak === "number",
  },
};

interface ChallengeCardProps {
  task: Task;
  icon: string;
  index: number;
  progressEntry?: ProgressEntry;
  onJoin: (task: Task) => void;
  trackingAvailable: boolean;
  syncingCompletion: boolean;
  progressReady: boolean;
}

const difficultyColors: Record<string, string> = {
  easy: "#00C853",
  medium: "#FFA500",
  hard: "#DC143C",
};

const challengeStyles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  joinButton: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

const ChallengeCard = ({
  task,
  icon,
  index = 0,
  progressEntry,
  onJoin,
  trackingAvailable,
  syncingCompletion,
  progressReady,
}: ChallengeCardProps) => {
  const { colors, isDark } = useTheme();
  const config = METRIC_CONFIG[task.type];

  const joined = task.completed || !!progressEntry?.joined;
  const completed = task.completed || !!progressEntry?.completed;
  const progressPercent = completed ? 100 : progressEntry?.percent ?? 0;
  const animatedProgress = useProgressAnimation(progressPercent);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const progressValue = completed ? task.target : progressEntry?.progressValue ?? 0;
  const formattedProgress = config
    ? `${config.formatValue(progressValue)} / ${config.formatTarget(task.target)} ${config.unitLabel}`
    : `${progressValue} / ${task.target}`;

  const progressSummary = completed
    ? "Completed 🎉"
    : `${Math.min(100, Math.round(progressPercent))}% · ${formattedProgress}`;

  const difficultyColor = difficultyColors[task.difficulty] || "#00C853";

  const joinDisabled = !progressReady || !trackingAvailable;
  const joinButtonLabel = !progressReady
    ? "Loading Progress..."
    : trackingAvailable
      ? "Join Challenge"
      : "Tracking Unavailable";
  const surfaceColor = colors.background.elevated;
  const borderColor = isDark ? colors.border.medium : colors.border.light;
  const mutedSurface = isDark ? colors.background.tertiary : colors.background.secondary;
  const joinBackground = joinDisabled ? mutedSurface : colors.status.success;
  const joinTextColor = joinDisabled ? colors.text.secondary : colors.background.primary;
  const joinAssistiveColor = colors.text.secondary;

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(index * 100)}
      style={[
        challengeStyles.cardContainer,
        {
          backgroundColor: surfaceColor,
          borderColor,
          shadowColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.16)",
        },
      ]}
    >
      <View className="flex-row items-start mb-4">
        <View className="bg-primary/10 dark:bg-primary/20 p-4 rounded-2xl mr-4">
          <FontAwesome5 name={icon || "running"} size={28} color="#00C853" />
        </View>
        <View className="flex-1">
          <Text
            className="text-xl font-bold tracking-tight"
            style={{ color: colors.text.primary }}
          >
            {task.type.charAt(0).toUpperCase() + task.type.slice(1)} Challenge
          </Text>
          <Text
            className="text-base mt-2 mb-3 leading-relaxed"
            style={{ color: colors.text.secondary }}
          >
            {task.description}
          </Text>
          <View className="flex-row items-center flex-wrap gap-2">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                🎯 {config ? `${config.formatTarget(task.target)} ${config.unitLabel}` : task.target}
              </Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full`} style={{ backgroundColor: `${difficultyColor}20` }}>
              <Text className="text-xs font-semibold" style={{ color: difficultyColor }}>
                ⚙️ {task.difficulty.toUpperCase()}
              </Text>
            </View>
            <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-semibold text-purple-700 dark:text-purple-300">🏃‍♂️ {task.type.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {!joined ? (
        <View>
          <Pressable
            disabled={joinDisabled}
            onPress={() => onJoin(task)}
            style={({ pressed }) => [
              challengeStyles.joinButton,
              {
                backgroundColor: joinBackground,
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: joinDisabled ? "transparent" : joinBackground,
                shadowOpacity: joinDisabled ? 0 : 0.25,
                elevation: joinDisabled ? 0 : 8,
              },
            ]}
          >
            <Text
              style={[challengeStyles.joinButtonText, { color: joinTextColor }]}
            >
              {joinButtonLabel}
            </Text>
          </Pressable>
          {!progressReady && (
            <Text
              className="text-xs mt-2 text-center"
              style={{ color: joinAssistiveColor }}
            >
              Preparing your activity data...
            </Text>
          )}
          {progressReady && !trackingAvailable && (
            <Text
              className="text-xs mt-2 text-center"
              style={{ color: joinAssistiveColor }}
            >
              Connect your activity tracker to start this challenge.
            </Text>
          )}
        </View>
      ) : (
        <View>
          <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <Animated.View
              style={[progressBarStyle, { height: "100%", backgroundColor: completed ? "#00C853" : "#00A843" }]}
            />
          </View>
          <Text
            className="mt-2 text-center font-medium"
            style={{ color: colors.text.secondary }}
          >
            {progressSummary}
          </Text>
          {syncingCompletion && !completed && (
            <Text
              className="mt-1 text-center text-xs"
              style={{ color: colors.text.tertiary }}
            >
              Syncing progress...
            </Text>
          )}
          {completed && !task.completed && (
            <Text
              className="mt-1 text-center text-xs"
              style={{ color: colors.text.tertiary }}
            >
              Finalizing completion...
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const TASK_TYPE_ICON: Record<Task["type"], string> = {
  run: "running",
  walk: "walking",
  capture: "flag",
  streak: "fire",
};

const ChallengesScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEntry>>({});
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const completionInFlight = useRef<Set<string>>(new Set());

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";

  const user = useStore((s) => s.user);
  const token = user?.token ?? authService.getToken();

  const ensureSyncingState = useCallback((taskId: string, syncing: boolean) => {
    setSyncingIds((prev) => {
      const next = new Set(prev);
      if (syncing) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, Partial<ProgressEntry & { metric: string }>>;
        if (parsed && typeof parsed === "object" && !cancelled) {
          const sanitized: Record<string, ProgressEntry> = {};
          Object.entries(parsed).forEach(([taskId, entry]) => {
            if (!entry || typeof entry !== "object") return;
            const metric = entry.metric;
            if (metric !== "run" && metric !== "walk" && metric !== "capture" && metric !== "streak") return;
            sanitized[taskId] = {
              joined: Boolean(entry.joined),
              baselineRaw: Number(entry.baselineRaw) || 0,
              metric,
              progressValue: Number(entry.progressValue) || 0,
              percent: Number(entry.percent) || 0,
              completed: Boolean(entry.completed),
              completionSynced: Boolean(entry.completionSynced),
            };
          });
          setProgressMap(sanitized);
        }
      } catch (err) {
        console.log("hydrate progress failed:", err);
      } finally {
        if (!cancelled) {
          setProgressHydrated(true);
        }
      }
    };

    hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!progressHydrated) return;
    AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap)).catch((err) => {
      console.log("persist progress failed:", err);
    });
  }, [progressMap, progressHydrated]);

  // Fetch user’s tasks from backend
  const fetchTasks = useCallback(async () => {
    if (!token) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to fetch challenges");
      }
      const payload = Array.isArray(data) ? data : data.tasks;
      setTasks(Array.isArray(payload) ? (payload as Task[]) : []);
    } catch (err) {
      console.error("Fetch tasks error:", err);
      Toast.show({
        type: "error",
        text1: "Unable to load challenges",
        text2: err instanceof Error ? err.message : "Please try again later.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const generateAITask = useCallback(async () => {
    if (!token) {
      Toast.show({
        type: "info",
        text1: "Sign in required",
        text2: "Log in to generate personalized challenges.",
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recentDistance: 4.5,
          streakDays: 3,
          avgSpeed: 7.2,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to create AI challenge");
      }
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
      }
    } catch (err) {
      console.error("Generate AI task error:", err);
      Toast.show({
        type: "error",
        text1: "Challenge generation failed",
        text2: err instanceof Error ? err.message : "Please try again in a moment.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!progressHydrated) return;

    const userSnapshot = user ?? null;

    setProgressMap((prev) => {
      let changed = false;
      const next: Record<string, ProgressEntry> = { ...prev };
      const taskById = new Map(tasks.map((task) => [task._id, task]));

      Object.keys(next).forEach((taskId) => {
        if (!taskById.has(taskId)) {
          delete next[taskId];
          changed = true;
        }
      });

      tasks.forEach((task) => {
        const config = METRIC_CONFIG[task.type];
        if (!config) return;

        const currentRaw = config.selector(userSnapshot);
        const existing = next[task._id];

        if (task.completed) {
          const baselineRaw = Number.isFinite(existing?.baselineRaw) ? existing!.baselineRaw : currentRaw;
          if (
            !existing ||
            !existing.completed ||
            existing.percent !== 100 ||
            existing.progressValue !== task.target ||
            !existing.completionSynced
          ) {
            next[task._id] = {
              joined: true,
              baselineRaw,
              metric: task.type,
              progressValue: task.target,
              percent: 100,
              completed: true,
              completionSynced: true,
            };
            changed = true;
          }
          return;
        }

        if (!existing || !existing.joined) {
          return;
        }

        let entry = existing.metric === task.type ? { ...existing } : undefined;

        if (!entry) {
          entry = {
            joined: true,
            baselineRaw: currentRaw,
            metric: task.type,
            progressValue: 0,
            percent: 0,
            completed: false,
            completionSynced: false,
          };
        }

        if (currentRaw < entry.baselineRaw) {
          entry = {
            ...entry,
            baselineRaw: currentRaw,
            progressValue: 0,
            percent: 0,
            completed: false,
            completionSynced: false,
          };
        }

        const delta = config.computeDelta(currentRaw, entry.baselineRaw);
        const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        const clampedValue = task.target > 0 ? Math.min(safeDelta, task.target) : safeDelta;
        const percent = task.target > 0 ? Math.min(100, Math.round((clampedValue / task.target) * 100)) : 100;
        const completed = safeDelta >= task.target;

        if (
          entry.progressValue !== clampedValue ||
          entry.percent !== percent ||
          entry.completed !== completed
        ) {
          entry = {
            ...entry,
            progressValue: clampedValue,
            percent,
            completed,
          };
        }

        const hasChanged =
          !existing ||
          existing.baselineRaw !== entry.baselineRaw ||
          existing.metric !== entry.metric ||
          existing.progressValue !== entry.progressValue ||
          existing.percent !== entry.percent ||
          existing.completed !== entry.completed ||
          existing.completionSynced !== entry.completionSynced ||
          existing.joined !== entry.joined;

        if (hasChanged) {
          next[task._id] = entry;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [tasks, user, progressHydrated]);

  useEffect(() => {
    if (!progressHydrated || !token) return;

    const pending = Object.entries(progressMap).filter(([taskId, entry]) => {
      if (!entry.completed || entry.completionSynced) return false;
      if (completionInFlight.current.has(taskId)) return false;
      const task = tasks.find((t) => t._id === taskId);
      return task ? !task.completed : false;
    });

    pending.forEach(([taskId]) => {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      completionInFlight.current.add(taskId);
      ensureSyncingState(taskId, true);

      const targetValue = task.target;

      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.msg || "Failed to sync completion");
          }

          setTasks((prev) =>
            prev.map((t) => (t._id === taskId ? { ...t, completed: true } : t))
          );

          setProgressMap((prev) => {
            const existing = prev[taskId];
            if (!existing) return prev;
            return {
              ...prev,
              [taskId]: {
                ...existing,
                completionSynced: true,
                completed: true,
                percent: 100,
                progressValue: targetValue,
              },
            };
          });

          Toast.show({
            type: "success",
            text1: "Challenge completed",
            text2: "Nice work! Goal achieved.",
            position: "bottom",
          });
        } catch (err) {
          console.error("Mark task complete error:", err);
          Toast.show({
            type: "error",
            text1: "Sync failed",
            text2: "We'll retry once you're back online.",
            position: "bottom",
          });
        } finally {
          completionInFlight.current.delete(taskId);
          ensureSyncingState(taskId, false);
        }
      })();
    });
  }, [progressMap, tasks, token, progressHydrated, ensureSyncingState]);

  const handleJoin = useCallback((task: Task) => {
    if (!progressHydrated) {
      Toast.show({
        type: "info",
        text1: "Almost ready",
        text2: "Loading your challenge progress...",
        position: "bottom",
      });
      return;
    }

    if (task.completed) {
      Toast.show({
        type: "info",
        text1: "Already completed",
        text2: "You have already finished this challenge!",
        position: "bottom",
      });
      return;
    }

    if (!token) {
      Toast.show({
        type: "info",
        text1: "Sign in required",
        text2: "Log in to join challenges.",
        position: "bottom",
      });
      return;
    }

    const config = METRIC_CONFIG[task.type];
    if (!config) {
      Toast.show({
        type: "info",
        text1: "Unsupported challenge",
        text2: "This challenge type isn't trackable yet.",
        position: "bottom",
      });
      return;
    }

    if (!config.canTrack(user ?? null)) {
      Toast.show({
        type: "info",
        text1: "Tracking unavailable",
        text2: "Connect your activity tracker to join.",
        position: "bottom",
      });
      return;
    }

    const baselineRaw = config.selector(user ?? null);

    setProgressMap((prev) => {
      const existing = prev[task._id];
      if (existing?.joined) {
        return prev;
      }
      return {
        ...prev,
        [task._id]: {
          joined: true,
          baselineRaw,
          metric: task.type,
          progressValue: 0,
          percent: 0,
          completed: false,
          completionSynced: false,
        },
      };
    });

    Toast.show({
      type: "success",
      text1: "Challenge joined 🎯",
      text2: "Track your activity to complete it.",
      position: "bottom",
    });
  }, [progressHydrated, token, user]);

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)} className="mb-6">
          <Text className={`text-4xl font-bold mb-3 ${textClass} tracking-tight`}>Challenges</Text>
          <Text className={`text-base mb-6 ${textClass} leading-relaxed opacity-80`}>
            Earn badges, stay consistent & keep running!
          </Text>

          <Pressable
            onPress={generateAITask}
            disabled={loading}
            className="overflow-hidden rounded-2xl shadow-xl shadow-primary-green/20 active:scale-98"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={['#00C853', '#00A843']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-4 px-6 flex-row items-center justify-center"
            >
              <Text className="text-black text-base font-bold mr-2">
                {loading ? "Working..." : "Generate AI Challenge"}
              </Text>
              <Text className="text-2xl">🤖</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {loading && tasks.length === 0 ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#00C853" />
            <Text className={`mt-4 ${textClass} opacity-70`}>Loading challenges...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} className="items-center justify-center py-20">
            <Text className="text-6xl mb-4">🎯</Text>
            <Text className={`text-center text-xl font-semibold ${textClass}`}>No challenges yet!</Text>
            <Text className={`text-center mt-2 ${textClass} opacity-70`}>Generate one to get started.</Text>
          </Animated.View>
        ) : (
          tasks.map((task, idx) => {
            const iconName = TASK_TYPE_ICON[task.type] || "running";
            const progressEntry = progressMap[task._id];
            const config = METRIC_CONFIG[task.type];
            const trackingAvailable = progressHydrated && !!config && config.canTrack(user ?? null);
            const syncingCompletion = syncingIds.has(task._id);

            return (
              <ChallengeCard
                key={task._id}
                index={idx}
                icon={iconName}
                task={task}
                progressEntry={progressEntry}
                onJoin={handleJoin}
                trackingAvailable={trackingAvailable}
                syncingCompletion={syncingCompletion}
                progressReady={progressHydrated}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengesScreen;
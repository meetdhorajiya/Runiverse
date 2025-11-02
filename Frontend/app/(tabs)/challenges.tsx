import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "@/store/useStore";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';

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

const ChallengeCard = ({
  icon,
  title,
  description,
  difficulty,
  type,
  target,
  isDarkMode,
  index = 0,
}: any) => {
  const [joined, setJoined] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressWidth = useSharedValue(0);

  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-600";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const difficultyColors: Record<string, string> = {
    easy: '#00C853',
    medium: '#FFA500',
    hard: '#DC143C',
  };

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const finishProgress = useCallback(() => {
    setProgress(100);
  }, []);

  const handleJoin = () => {
    if (joined) return;
    setJoined(true);
    Toast.show({
      type: "success",
      text1: "Challenge Joined 🎯",
      text2: "Let's crush it!",
      position: "bottom",
    });

    progressWidth.value = withTiming(100, { duration: 4000 }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(finishProgress)();
      }
    });
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(600).delay(index * 100)}
      className={`rounded-3xl p-6 mb-5 shadow-lg ${cardBgClass} border border-gray-200/50 dark:border-gray-700/50`}
    >
      <View className="flex-row items-start mb-4">
        <View className="bg-primary/10 dark:bg-primary/20 p-4 rounded-2xl mr-4">
          <FontAwesome5
            name={icon || "running"}
            size={28}
            color="#00C853"
          />
        </View>
        <View className="flex-1">
          <Text className={`text-xl font-bold ${textClass} tracking-tight`}>{title}</Text>
          <Text className={`text-base mt-2 mb-3 ${secondaryTextClass} leading-relaxed`}>
            {description}
          </Text>
          <View className="flex-row items-center flex-wrap gap-2">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">🎯 {target} km</Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full`} style={{ backgroundColor: difficultyColors[difficulty] + '20' }}>
              <Text className="text-xs font-semibold" style={{ color: difficultyColors[difficulty] }}>⚙️ {difficulty.toUpperCase()}</Text>
            </View>
            <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-semibold text-purple-700 dark:text-purple-300">🏃‍♂️ {type.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {!joined ? (
        <Pressable
          className="bg-primary-green p-4 rounded-2xl items-center shadow-lg shadow-primary-green/20 active:scale-98"
          onPress={handleJoin}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <Text className="text-black text-base font-bold tracking-wide">Join Challenge</Text>
        </Pressable>
      ) : (
        <View>
          <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <Animated.View
              style={[progressBarStyle, { height: "100%", backgroundColor: "#00C853" }]}
            />
          </View>
          <Text className={`mt-2 text-center ${secondaryTextClass} font-medium`}>
            {progress}% completed
          </Text>
        </View>
      )}

    </Animated.View>
  );
};

const ChallengesScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);


  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";

  const user = useStore((s) => s.user);
  const token = user?.token;
  // 🧠 Replace with your stored token (from login)

  // Fetch user’s tasks from backend
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setTasks(data.tasks || data);
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Generate AI-based new challenge
  const generateAITask = async () => {
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
      if (data.task) setTasks((prev) => [data.task, ...prev]);
    } catch (err) {
      console.error("Generate AI task error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)} className="mb-6">
          <Text className={`text-4xl font-bold mb-3 ${textClass} tracking-tight`}>Challenges</Text>
          <Text className={`text-base mb-6 ${textClass} leading-relaxed opacity-80`}>Earn badges, stay consistent & keep running!</Text>

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
                {loading ? "Generating..." : "Generate AI Challenge"}
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
          tasks.map((task: any, idx: number) => (
            <ChallengeCard
              key={task._id}
              index={idx}
              icon={task.type === "run" ? "running" : "walking"}
              title={task.type.charAt(0).toUpperCase() + task.type.slice(1) + " Challenge"}
              description={task.description}
              difficulty={task.difficulty}
              type={task.type}
              target={task.target}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengesScreen;
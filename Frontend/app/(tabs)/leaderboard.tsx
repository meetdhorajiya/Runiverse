import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "@/store/useStore";
import { leaderboardService, LeaderboardEntry } from "@/services/leaderboardService";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const LeaderboardScreen = () => {
  const { theme } = useTheme();
  const user = useStore((s) => s.user);
  const isDarkMode = theme === "dark";
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const city = user?.city?.trim() || "Gandhinagar";
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const fetchLeaderboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!city) {
        if (isMountedRef.current) {
          setEntries([]);
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      if (mode === "refresh") {
        if (isMountedRef.current) setRefreshing(true);
      } else if (isMountedRef.current) {
        setLoading(true);
      }

      if (isMountedRef.current) setError(null);

      try {
        const data = await leaderboardService.fetchCityLeaderboard(city);
        if (isMountedRef.current) setEntries(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load leaderboard";
        if (isMountedRef.current) setError(message);
      } finally {
        if (!isMountedRef.current) return;
        if (mode === "refresh") setRefreshing(false);
        else setLoading(false);
      }
    },
    [city]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    let rankColor = isDarkMode ? "text-gray-400" : "text-gray-600";
    let rankBgColor = isDarkMode ? "bg-gray-700" : "bg-gray-200";
    let rankIcon = "🏅";
    
    if (rank === 1) {
      rankColor = "text-yellow-400";
      rankBgColor = "bg-yellow-500/10";
      rankIcon = "🥇";
    }
    if (rank === 2) {
      rankColor = "text-gray-300";
      rankBgColor = "bg-gray-400/10";
      rankIcon = "🥈";
    }
    if (rank === 3) {
      rankColor = "text-yellow-600";
      rankBgColor = "bg-yellow-600/10";
      rankIcon = "🥉";
    }

    const avatarSource = item.avatarUrl
      ? { uri: item.avatarUrl }
      : { uri: "https://i.pravatar.cc/150?u=runiverse-placeholder" };
    const areaLabel = `${Math.round(item.totalArea).toLocaleString()} m²`;
    const stepsLabel = `${Math.round(item.steps).toLocaleString()} steps`;

    return (
      <Animated.View 
        entering={FadeInDown.duration(400).delay(index * 50)}
        className={`flex-row items-center p-5 rounded-3xl mb-3 ${cardBgClass} shadow-md border border-gray-200/50 dark:border-gray-700/50`}
      >
        <View className={`${rankBgColor} w-12 h-12 rounded-2xl items-center justify-center mr-3`}>
          {rank <= 3 ? (
            <Text className="text-2xl">{rankIcon}</Text>
          ) : (
            <Text className={`text-lg font-bold ${rankColor}`}>#{rank}</Text>
          )}
        </View>
        <Image source={avatarSource} className="w-14 h-14 rounded-full mr-4 border-2 border-primary/20 shadow-sm" />
        <View className="flex-1">
          <Text className={`text-lg font-bold ${textClass} tracking-tight`}>{item.username}</Text>
          <View className="flex-row items-center mt-1">
            <FontAwesome5 name="map-marked-alt" size={12} color="#00C853" />
            <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} ml-1`}>{areaLabel}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-base font-bold ${textClass}`}>{Math.round(item.steps).toLocaleString()}</Text>
          <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>steps</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="p-6">
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <Text className={`text-4xl font-bold mb-3 ${textClass} tracking-tight`}>Leaderboard</Text>
          <View className="flex-row items-center bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full self-start">
            <FontAwesome5 name="map-marker-alt" size={16} color="#00C853" />
            <Text className={`ml-2 text-base font-semibold ${isDarkMode ? "text-text-primary" : "text-gray-700"}`}>{city}</Text>
          </View>
          {error && (
            <View className="mt-4 bg-red-100 dark:bg-red-900/20 px-4 py-3 rounded-2xl">
              <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {loading && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDarkMode ? "#60A5FA" : "#2563EB"} />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshing={refreshing}
          onRefresh={() => fetchLeaderboard("refresh")}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20">
                <FontAwesome5 name="users" size={36} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <Text className={`mt-3 text-base ${isDarkMode ? "text-text-secondary" : "text-gray-600"}`}>
                  No players tracked in this city yet.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default LeaderboardScreen;
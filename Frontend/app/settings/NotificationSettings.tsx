import React, { useState } from "react";
import { ScrollView, Switch, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function NotificationSettings() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDarkMode = theme === "dark";

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [challengeNotifs, setChallengeNotifs] = useState(true);
  const [achievementNotifs, setAchievementNotifs] = useState(true);
  const [territoryNotifs, setTerritoryNotifs] = useState(false);
  const [socialNotifs, setSocialNotifs] = useState(true);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const subtleText = isDarkMode ? "text-gray-400" : "text-gray-600";

  const NotificationRow = ({ 
    label, 
    description, 
    value, 
    onValueChange 
  }: { 
    label: string; 
    description?: string;
    value: boolean; 
    onValueChange: (value: boolean) => void;
  }) => (
    <View className="py-4 border-b border-gray-200 dark:border-gray-700">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-4">
          <Text className={`text-base font-medium ${textClass}`}>{label}</Text>
          {description && (
            <Text className={`text-sm mt-1 ${subtleText}`}>{description}</Text>
          )}
        </View>
        <Switch 
          value={value} 
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: "#6A5ACD" }}
          thumbColor={value ? "#00C853" : "#f4f3f4"}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center mb-6">
            <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2">
              <Ionicons name="arrow-back" size={28} color={isDarkMode ? "white" : "black"} />
            </Pressable>
            <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Notifications</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl mr-3">
                <Ionicons name="notifications" size={24} color="#6A5ACD" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>General Settings</Text>
            </View>

            <NotificationRow
              label="Push Notifications"
              description="Receive alerts on your device"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />

            <NotificationRow
              label="Email Notifications"
              description="Get updates via email"
              value={emailEnabled}
              onValueChange={setEmailEnabled}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-orange-500/10 p-3 rounded-2xl mr-3">
                <Ionicons name="options" size={24} color="#FFA500" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>Notification Types</Text>
            </View>

            <NotificationRow
              label="Challenge Updates"
              description="New challenges and progress milestones"
              value={challengeNotifs}
              onValueChange={setChallengeNotifs}
            />

            <NotificationRow
              label="Achievements"
              description="When you earn badges and rewards"
              value={achievementNotifs}
              onValueChange={setAchievementNotifs}
            />

            <NotificationRow
              label="Territory Alerts"
              description="Territory claims and contests"
              value={territoryNotifs}
              onValueChange={setTerritoryNotifs}
            />

            <View className="py-4">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className={`text-base font-medium ${textClass}`}>Social Activity</Text>
                  <Text className={`text-sm mt-1 ${subtleText}`}>Friend requests and community updates</Text>
                </View>
                <Switch 
                  value={socialNotifs} 
                  onValueChange={setSocialNotifs}
                  trackColor={{ false: "#767577", true: "#6A5ACD" }}
                  thumbColor={socialNotifs ? "#00C853" : "#f4f3f4"}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


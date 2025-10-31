import React, { useState } from "react";
import { ScrollView, Switch, Text, Pressable, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

export default function PrivacySettings() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDarkMode = theme === "dark";

  const [showProfile, setShowProfile] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [allowRequests, setAllowRequests] = useState<"Anyone" | "Friends" | "None">("Anyone");

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const subtleText = isDarkMode ? "text-gray-400" : "text-gray-600";

  const handleBlockUser = () => {
    Alert.alert(
      "Block User",
      "Enter the username of the user you want to block",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            Toast.show({
              type: "success",
              text1: "User Blocked",
              text2: "This feature will be fully implemented soon.",
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center mb-6">
            <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2">
              <Ionicons name="arrow-back" size={28} color={isDarkMode ? "white" : "black"} />
            </Pressable>
            <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Privacy</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-green-500/10 p-3 rounded-2xl mr-3">
                <Ionicons name="lock-closed" size={24} color="#00C853" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>Profile Visibility</Text>
            </View>

            <View className="py-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className={`text-base font-medium ${textClass}`}>Show Profile Publicly</Text>
                  <Text className={`text-sm mt-1 ${subtleText}`}>Allow others to see your profile</Text>
                </View>
                <Switch 
                  value={showProfile} 
                  onValueChange={setShowProfile}
                  trackColor={{ false: "#767577", true: "#6A5ACD" }}
                  thumbColor={showProfile ? "#00C853" : "#f4f3f4"}
                />
              </View>
            </View>

            <View className="py-4">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className={`text-base font-medium ${textClass}`}>Show Activity Status</Text>
                  <Text className={`text-sm mt-1 ${subtleText}`}>Let others see when you're active</Text>
                </View>
                <Switch 
                  value={showActivity} 
                  onValueChange={setShowActivity}
                  trackColor={{ false: "#767577", true: "#6A5ACD" }}
                  thumbColor={showActivity ? "#00C853" : "#f4f3f4"}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-500/10 p-3 rounded-2xl mr-3">
                <Ionicons name="people" size={24} color="#3B82F6" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>Who Can Contact You</Text>
            </View>

            <Text className={`text-sm mb-3 ${subtleText}`}>Choose who can send you friend requests</Text>

            {(["Anyone", "Friends", "None"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setAllowRequests(option)}
                className={`p-4 rounded-xl mb-3 ${
                  allowRequests === option
                    ? 'bg-primary/20 border-2 border-primary'
                    : isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className={`text-base font-medium ${textClass}`}>{option}</Text>
                  {allowRequests === option && (
                    <Ionicons name="checkmark-circle" size={24} color="#6A5ACD" />
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} className={`rounded-3xl p-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-red-500/10 p-3 rounded-2xl mr-3">
                <Ionicons name="ban" size={24} color="#EF4444" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>Safety</Text>
            </View>

            <Text className={`text-sm mb-4 ${subtleText}`}>
              Manage blocked users and report concerns
            </Text>

            <Pressable
              onPress={handleBlockUser}
              className="bg-red-500 py-4 rounded-xl items-center active:scale-95"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Text className="text-white font-bold text-base tracking-wide">Block / Report User</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


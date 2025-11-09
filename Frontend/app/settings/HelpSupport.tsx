import React from "react";
import { Linking, ScrollView, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";

export default function HelpSupport() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDarkMode = theme === "dark";

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const subtleText = isDarkMode ? "text-gray-400" : "text-gray-600";

  const supportOptions = [
    {
      icon: "book",
      title: "FAQ & Guides",
      description: "Find answers to common questions",
      color: "#6A5ACD",
      onPress: () => Toast.show({ type: "info", text1: "FAQ coming soon!" }),
    },
    {
      icon: "mail",
      title: "Contact Support",
      description: "Get help from our team",
      color: "#00C853",
      onPress: () => Linking.openURL("mailto:support@runiverse.app"),
    },
    {
      icon: "chatbubble-ellipses",
      title: "Send Feedback",
      description: "Share your thoughts and suggestions",
      color: "#FFA500",
      onPress: () => Toast.show({ type: "info", text1: "Feedback form coming soon!" }),
    },
    {
      icon: "bug",
      title: "Report a Bug",
      description: "Help us improve the app",
      color: "#EF4444",
      onPress: () => Toast.show({ type: "info", text1: "Bug report form coming soon!" }),
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center mb-6">
            <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2">
              <Ionicons name="arrow-back" size={28} color={isDarkMode ? "white" : "black"} />
            </Pressable>
            <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Help & Support</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
            {supportOptions.map((option, index) => (
              <Pressable
                key={option.title}
                onPress={option.onPress}
                className={`flex-row items-center py-4 ${
                  index < supportOptions.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                } active:opacity-70`}
              >
                <View 
                  className="p-3 rounded-2xl mr-4"
                  style={{ backgroundColor: `${option.color}15` }}
                >
                  <Ionicons name={option.icon as any} size={24} color={option.color} />
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-semibold ${textClass}`}>{option.title}</Text>
                  <Text className={`text-sm mt-1 ${subtleText}`}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#666' : '#999'} />
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-500/10 p-3 rounded-2xl mr-3">
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
              </View>
              <Text className={`text-xl font-bold ${textClass}`}>App Information</Text>
            </View>

            <View className="space-y-3">
              <View className="flex-row justify-between py-2">
                <Text className={subtleText}>Version</Text>
                <Text className={`font-medium ${textClass}`}>1.0.0</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className={subtleText}>Build</Text>
                <Text className={`font-medium ${textClass}`}>2025.1</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className={subtleText}>Last Updated</Text>
                <Text className={`font-medium ${textClass}`}>Nov 1, 2025</Text>
              </View>
            </View>

            <Pressable
              onPress={() => Linking.openURL("https://runiverse.app/privacy")}
              className="mt-6 py-3 rounded-xl items-center bg-primary/10 active:scale-95"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Text className="text-primary font-semibold">Privacy Policy</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL("https://runiverse.app/terms")}
              className="mt-3 py-3 rounded-xl items-center bg-primary/10 active:scale-95"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Text className="text-primary font-semibold">Terms of Service</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


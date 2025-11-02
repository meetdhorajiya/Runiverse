import React from "react";
import { ScrollView, Text, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

export default function Settings() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const sections = [
    { 
      title: "Account Settings", 
      route: "/settings/AccountSettings",
      icon: "person-circle",
      color: "#6A5ACD"
    },
    { 
      title: "Privacy Settings", 
      route: "/settings/PrivacySettings",
      icon: "lock-closed",
      color: "#00C853"
    },
    { 
      title: "Notification Settings", 
      route: "/settings/NotificationSettings",
      icon: "notifications",
      color: "#FF6B6B"
    },
    { 
      title: "Help & Support", 
      route: "/settings/HelpSupport",
      icon: "help-circle",
      color: "#FFA500"
    },
    { 
      title: "Logout", 
      route: "/settings/Logout",
      icon: "log-out",
      color: "#EF4444"
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <View className="rounded-3xl overflow-hidden mb-6 shadow-xl">
              <LinearGradient
                colors={['#6A5ACD', '#00C853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-6"
              >
                <Text className="text-4xl font-black text-white tracking-tight">Settings</Text>
                <Text className="text-white/90 text-base mt-2 leading-relaxed">
                  Manage your account and app preferences
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl shadow-lg overflow-hidden ${cardBgClass}`}>
            {sections.map((section, index) => (
              <Pressable
                key={section.title}
                onPress={() => router.push(section.route as any)}
                className={`flex-row items-center py-5 px-6 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } ${index === sections.length - 1 ? 'border-b-0' : ''} active:bg-gray-100 dark:active:bg-gray-800`}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View 
                  className="p-3 rounded-2xl mr-4"
                  style={{ backgroundColor: `${section.color}15` }}
                >
                  <Ionicons name={section.icon as any} size={24} color={section.color} />
                </View>
                <Text className={`flex-1 text-lg font-medium ${isDarkMode ? 'text-text-primary' : 'text-gray-900'}`}>
                  {section.title}
                </Text>
                <Ionicons name="chevron-forward" size={22} color={isDarkMode ? '#9CA3AF' : '#666666'} />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// export default SettingsScreen;
// import React from 'react';
// import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
// import { Link } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';

// const SettingsScreen = () => {
//   const { theme, toggleTheme } = useTheme();
//   const isDarkMode = theme === 'dark';

//   const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
//   const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
//   const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

//   return (
//     <SafeAreaView className={`flex-1 ${bgClass}`}>
//       <View className="flex-row justify-between items-center px-6 py-4">
//         <Link href="/(tabs)/profile" asChild>
//           <TouchableOpacity className="p-2">
//             <Ionicons name="arrow-back" size={28} color={isDarkMode ? 'white' : 'black'} />
//           </TouchableOpacity>
//         </Link>
//         <Text className={`text-2xl font-bold ${textClass}`}>Settings</Text>
//         <View className="w-8" />
//       </View>

//       <View className="flex-1 p-6">
//         <View className={`rounded-xl p-6 shadow-md ${cardBgClass} mb-6`}>
//           <Text className={`text-xl font-semibold mb-4 ${textClass}`}>App Theme</Text>
//           <TouchableOpacity
//             onPress={toggleTheme}
//             className={`flex-row items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
//           >
//             <View className="flex-row items-center">
//               <Ionicons 
//                 name={isDarkMode ? 'moon' : 'sunny'} 
//                 size={24} 
//                 color={isDarkMode ? 'white' : 'orange'} 
//                 className="mr-3" 
//               />
//               <Text className={`text-lg font-medium ${textClass}`}>
//                 {isDarkMode ? 'Dark Mode' : 'Light Mode'}
//               </Text>
//             </View>
//             <Ionicons 
//               name="swap-horizontal" 
//               size={24} 
//               color={isDarkMode ? 'white' : 'black'} 
//             />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default SettingsScreen;
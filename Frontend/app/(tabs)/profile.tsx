import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/AuthService';
import * as ImagePicker from "expo-image-picker";
import { avatarService } from "@/services/avatarService";
import Toast from "react-native-toast-message";
import { AvatarUploadResponse } from "@/store/types";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileScreen = () => {
  const { theme } = useTheme();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const isDarkMode = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-600";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const iconColor = isDarkMode ? "white" : "black";
  const statTileBg = isDarkMode ? "bg-gray-800" : "bg-gray-100";

  const formatNumber = (value?: number | null) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat().format(value);
  };

  const formatDistance = (value?: number | null) => {
    if (value === undefined || value === null || !Number.isFinite(value)) return '—';
    if (value >= 1000) {
      const km = value / 1000;
      const precision = km >= 10 ? 1 : 2;
      return `${km.toFixed(precision)} km`;
    }
    return `${Math.round(value)} m`;
  };

  const stats = useMemo(
    () => [
      { key: 'steps-today', label: 'Today\'s Steps', value: formatNumber(user?.steps) },
      { key: 'distance-today', label: 'Today\'s Distance', value: formatDistance(user?.distance) },
      { key: 'lifetime-steps', label: 'All-Time Steps', value: formatNumber(user?.lifetimeSteps) },
      { key: 'lifetime-distance', label: 'All-Time Distance', value: formatDistance(user?.lifetimeDistance) },
      { key: 'territories', label: 'Territories Captured', value: formatNumber(user?.territories) },
    ],
    [user?.distance, user?.lifetimeDistance, user?.lifetimeSteps, user?.steps, user?.territories]
  );

  const handleAvatarUpload = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Toast.show({
          type: "error",
          text1: "Permission denied",
          text2: "Cannot access gallery",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setLoading(true);

      const uploadRes = (await avatarService.uploadAvatar(result.assets[0].uri)) as AvatarUploadResponse;


      if (uploadRes?.success && uploadRes.data?.avatarUrl) {
        setUser({
          id: user?.id ?? "",
          username: user?.username ?? "Unknown",
          avatarUrl: uploadRes.data?.avatarUrl ?? user?.avatarUrl ?? "",
          groupId: user?.groupId ?? null,
          email: user?.email,
          steps: user?.steps,
          distance: user?.distance,
          territories: user?.territories,
          displayName: user?.displayName,
          city: user?.city,
          lifetimeSteps: user?.lifetimeSteps,
          lifetimeDistance: user?.lifetimeDistance,
          token: user?.token,
        });
        Toast.show({ type: "success", text1: "Avatar updated!" });
      } else {
        Toast.show({
          type: "error",
          text1: uploadRes?.message || "Upload failed",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error uploading avatar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!authService.getToken()) return; // not logged in yet
      try {
        setLoading(true);
        const { success, data, message } = await profileService.fetchMe();
        if (success && data) {
          const current = useStore.getState().user;
          const merged = current ? { ...current, ...data } : (data as any);
          setUser(merged as any);
          setError(null);
        } else if (!success) {
          setError(message || 'Failed to load profile');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setUser]);

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          <Animated.View entering={FadeInUp.duration(600).delay(100)}>
            <View className="rounded-3xl overflow-hidden mb-6 shadow-xl">
              <LinearGradient
                colors={['#6A5ACD', '#00C853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-6"
              >
                <View className="relative flex-row items-center mb-4">
                  <View className="relative">
                    <Image
                      source={{ uri: user?.avatarUrl || "https://i.pravatar.cc/150?u=placeholder" }}
                      className="w-24 h-24 rounded-full border-4 border-white/80 shadow-lg"
                    />
                    <Pressable
                      onPress={handleAvatarUpload}
                      className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-full shadow-lg active:scale-95"
                      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Ionicons name="camera" size={18} color="#00C853" />
                    </Pressable>
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-2xl font-bold text-white tracking-tight">{user?.username || 'Runner'}</Text>
                    <Text className="text-sm text-white/80 mt-1">{user?.email || 'user@runiverse.com'}</Text>
                  </View>
                </View>
                <Text className="text-sm text-white/90 leading-relaxed mb-4">
                  Every mile is a memory, every run a new discovery in the Runiverse.
                </Text>
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-white/70 text-xs uppercase tracking-wide">City</Text>
                    <Text className="text-lg font-semibold text-white mt-1">{user?.city || 'Unknown'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white/70 text-xs uppercase tracking-wide">Territories</Text>
                    <Text className="text-lg font-semibold text-white mt-1">{formatNumber(user?.territories)}</Text>
                  </View>
                </View>
                <Link href="../edit-profile" asChild>
                  <Pressable 
                    className="mt-6 self-start bg-white px-6 py-3 rounded-full shadow-lg active:scale-95"
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text className="text-primary font-semibold tracking-wide">Edit Profile</Text>
                  </Pressable>
                </Link>
              </LinearGradient>
            </View>
          </Animated.View>

          {loading && (
            <Animated.View entering={FadeInDown.duration(400)} className="flex-row items-center mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl">
              <ActivityIndicator color={iconColor} />
              <Text className={`ml-3 ${secondaryTextClass}`}>Refreshing profile…</Text>
            </Animated.View>
          )}

          {error && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text className={`mb-4 p-3 rounded-2xl ${isDarkMode ? 'text-red-300 bg-red-900/20' : 'text-red-600 bg-red-50'}`}>{error}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
            <View className="flex-row justify-between items-center mb-5">
              <Text className={`text-2xl font-bold ${textClass} tracking-tight`}>Progress Overview</Text>
              <Text className={`text-xs ${secondaryTextClass} uppercase tracking-wide`}>Live</Text>
            </View>
            <View className="flex-row flex-wrap -mx-2">
              {stats.map((stat, idx) => (
                <Animated.View 
                  key={stat.key} 
                  entering={FadeInDown.duration(600).delay(300 + idx * 50)}
                  className="w-1/2 px-2 pb-4"
                >
                  <View className={`rounded-2xl p-4 ${statTileBg} shadow-sm border border-gray-200/50 dark:border-gray-700/50`}>
                    <Text className={`${secondaryTextClass} text-xs uppercase tracking-wide font-medium`}>{stat.label}</Text>
                    <Text className={`text-2xl font-bold mt-2 ${textClass} tracking-tight`}>{stat.value}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(400)} className={`rounded-3xl p-6 shadow-lg mb-6 ${cardBgClass}`}>
            <Text className={`text-xl font-semibold mb-4 ${textClass} tracking-tight`}>Account Details</Text>
            <InfoRow label="Email" value={user?.email || 'Not provided'} isDarkMode={isDarkMode} />
            <View className="mt-4">
              <InfoRow label="Member since" value={user ? new Date().getFullYear().toString() : '—'} isDarkMode={isDarkMode} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(500)} className={`rounded-3xl shadow-lg overflow-hidden ${cardBgClass}`}>
            <ProfileOption icon="trophy" text="My Achievements" isDarkMode={isDarkMode} index={0} />
            <ProfileOption icon="route" text="Route History" isDarkMode={isDarkMode} index={1} />
            <ProfileOption icon="user-friends" text="Friends & Community" isDarkMode={isDarkMode} index={2} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(550)} className="mt-6">
            <Link href="/settings" asChild>
              <Pressable 
                className={`rounded-3xl shadow-lg overflow-hidden flex-row items-center justify-between py-5 px-6 ${cardBgClass} active:opacity-80`}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="flex-row items-center flex-1">
                  <View className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl mr-4">
                    <Ionicons name="settings" size={24} color={isDarkMode ? '#00C853' : '#6A5ACD'} />
                  </View>
                  <Text className={`text-lg font-semibold ${textClass}`}>Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={isDarkMode ? '#9CA3AF' : '#666666'} />
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ProfileOptionProps {
  icon: keyof typeof FontAwesome5.glyphMap;
  text: string;
  isDarkMode: boolean;
  index?: number;
}

const ProfileOption = ({ icon, text, isDarkMode, index = 0 }: ProfileOptionProps) => (
  <Pressable 
    className={`flex-row items-center py-5 px-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} last:border-b-0 active:bg-gray-100 dark:active:bg-gray-800`}
    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
  >
    <View className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl mr-4">
      <FontAwesome5 name={icon} size={20} color={isDarkMode ? '#FFFFFF' : '#6A5ACD'} />
    </View>
    <Text className={`flex-1 text-lg font-medium ${isDarkMode ? 'text-text-primary' : 'text-gray-900'}`}>{text}</Text>
    <Ionicons name="chevron-forward" size={22} color={isDarkMode ? '#9CA3AF' : '#666666'} />
  </Pressable>
);

interface InfoRowProps {
  label: string;
  value: string;
  isDarkMode: boolean;
}

const InfoRow = ({ label, value, isDarkMode }: InfoRowProps) => (
  <View className="flex-row justify-between">
    <Text className={`${isDarkMode ? 'text-text-secondary' : 'text-gray-500'} text-sm`}>{label}</Text>
    <Text className={`${isDarkMode ? 'text-text-primary' : 'text-gray-900'} text-sm font-medium`}>{value}</Text>
  </View>
);

export default ProfileScreen;
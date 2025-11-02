import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Award, BarChart3, Home, MapPinned, User } from "lucide-react-native";

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const accentGradient = isDark ? colors.gradients.sunsetGlow : colors.gradients.tropicalParadise;
  const activeTint = accentGradient[accentGradient.length - 1];
  const inactiveTint = isDark ? colors.text.tertiary : colors.text.secondary;
  const tabBackground = isDark ? colors.background.secondary : colors.background.elevated;
  const borderTone = isDark ? colors.border.medium : colors.border.light;
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      initialRouteName="index" 
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 6,
        },
        tabBarStyle: {
          backgroundColor: tabBackground,
          borderTopColor: borderTone,
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Home color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <BarChart3 color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Run',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MapPinned color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Award color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <User color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
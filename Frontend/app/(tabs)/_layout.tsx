import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Import MaterialCommunityIcons

export default function TabLayout() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Tabs
      initialRouteName="index" 
      screenOptions={{
        tabBarActiveTintColor: isDarkMode ? '#00C853' : '#166534', // Green color
        tabBarInactiveTintColor: isDarkMode ? '#A9A9A9' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#161622' : '#FFFFFF',
          borderTopWidth: 0,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Run',
          tabBarIcon: ({ color, size }) => (
            
            <MaterialCommunityIcons name="map-marker-distance" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => (
            
            <MaterialCommunityIcons name="medal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            
            <FontAwesome5 name="user-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
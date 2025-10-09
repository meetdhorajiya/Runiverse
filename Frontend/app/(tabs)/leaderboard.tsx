import React, { useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';

const leaderboardData = [
  { id: '1', name: 'Divayang', distance: 125.5, avatar: 'https://i.pravatar.cc/150?u=maria' },
  { id: '2', name: 'Ronak Dev', distance: 110.2, avatar: 'https://i.pravatar.cc/150?u=maria' },
  { id: '3', name: 'Sujal', distance: 98.7, avatar: 'https://i.pravatar.cc/150?u=maria' },
  { id: '4', name: 'Aayush', distance: 85.1, avatar: 'https://i.pravatar.cc/150?u=maria' },
  { id: '5', name: 'Saahil', distance: 72.4, avatar: 'https://i.pravatar.cc/150?u=maria' },
];

const LeaderboardScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [activeTab, setActiveTab] = useState('Weekly');

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const renderItem = ({ item, index }: { item: typeof leaderboardData[0], index: number }) => {
    const rank = index + 1;
    let rankColor = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    if (rank === 1) rankColor = 'text-yellow-400';
    if (rank === 2) rankColor = 'text-gray-300';
    if (rank === 3) rankColor = 'text-yellow-600';

    return (
      <View className={`flex-row items-center p-4 rounded-lg mb-2 ${cardBgClass}`}>
        <Text className={`text-xl font-bold w-10 ${rankColor}`}>#{rank}</Text>
        <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full mr-4" />
        <View className="flex-1">
          <Text className={`text-lg font-semibold ${textClass}`}>{item.name}</Text>
        </View>
        <Text className={`text-lg font-bold ${textClass}`}>{item.distance} mi</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="p-6">
        <Text className={`text-3xl font-bold mb-6 ${textClass}`}>Leaderboard</Text>
        {/* You can add logic for the tabs here later */}
      </View>
      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24 }}
      />
    </SafeAreaView>
  );
};

export default LeaderboardScreen;
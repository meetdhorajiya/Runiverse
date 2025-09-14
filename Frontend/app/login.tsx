import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';

// Development bypass flag. Set to false to restore real authentication.
const DEV_BYPASS = true;

const LoginScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const setUser = useStore(s => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (DEV_BYPASS) {
      // Directly set a dummy user and navigate
      setUser({
        id: 'dev-user',
        username: 'DevUser',
        avatarUrl: 'https://i.pravatar.cc/150?u=dev-user',
        email: 'dev@local.test'
      } as any);
      router.replace('/(tabs)');
      return;
    }

    if (!email || !password) {
      Alert.alert('Validation', 'Email and password required');
      return;
    }
    try {
      setLoading(true);
      const { success, message, user } = await authService.login(email.trim(), password);
      if (!success || !user) {
        Alert.alert('Login Failed', message);
        return;
      }
      setUser({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar || user.avatarUrl || 'https://i.pravatar.cc/150?u=' + user.id,
        email: user.email,
      } as any);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-500";
  const inputBgClass = isDarkMode ? "bg-card-dark" : "bg-gray-200";
  const inputTextClass = isDarkMode ? "text-white" : "text-black";
  const iconColor = isDarkMode ? "white" : "black";

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="px-6 py-4">
        <Link href="/" asChild>
          <TouchableOpacity className="p-2 self-start" disabled={loading}>
            <Ionicons name="arrow-back" size={28} color={iconColor} />
          </TouchableOpacity>
        </Link>
      </View>
      
      <View className="flex-1 justify-center p-6">
        <Text className={`text-4xl font-bold mb-2 ${textClass}`}>Welcome Back!</Text>
        <Text className={`text-lg mb-8 ${secondaryTextClass}`}>Log in to continue your journey.</Text>

        <View className={`rounded-xl mb-4 ${inputBgClass}`}>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor={isDarkMode ? '#A9A9A9' : '#6B7280'}
            className={`p-4 text-base ${inputTextClass}`}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

        <View className={`rounded-xl mb-6 ${inputBgClass}`}>
          <TextInput
            placeholder="Password"
            placeholderTextColor={isDarkMode ? '#A9A9A9' : '#6B7280'}
            className={`p-4 text-base ${inputTextClass}`}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          onPress={handleLogin} 
          disabled={loading}
          className="bg-primary-green p-4 rounded-xl items-center justify-center shadow-md"
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text className="text-black text-lg font-bold">Log In</Text>}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className={`text-base ${secondaryTextClass}`}>Don't have an account? </Text>
          <Link href="/register">
            <Text className="text-primary-green font-bold text-base">Sign Up</Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/AuthService';
import { profileService } from '@/services/profileService';
import { useStore } from '@/store/useStore';

const LoginScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const setUser = useStore(s => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Enable dev-only direct login via env flag
  const ENABLE_DEV_LOGIN = process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === 'true';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // Dev bypass (only in Debug + when enabled)
    if (__DEV__ && ENABLE_DEV_LOGIN && email === 'dev' && password === 'dev') {
      return devDirectLogin();
    }

    try {
      console.log('Attempting login with:', { email, baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL });
      
      const result = await authService.login(email, password);
      console.log('Login result:', result);
      
      if (result.success && result.user && result.token) {
        // Build base user from auth response
        const baseUser = {
          id: result.user._id || result.user.id,
          username: result.user.username,
          avatarUrl: result.user.avatar || result.user.avatarUrl || `https://i.pravatar.cc/150?u=${result.user._id || result.user.id}`,
          email: result.user.email,
          lastName: result.user.lastName || '',
          mobileNumber: result.user.mobileNumber || '',
          steps: result.user.steps || 0,
          distance: result.user.distance || 0,
          territories: result.user.territories || 0,
        };

        try {
          // Enrich with profile data
          const profileResult = await profileService.fetchMe();
          if (profileResult.success && profileResult.data) {
            setUser({ ...baseUser, ...profileResult.data } as any);
          } else {
            setUser(baseUser as any);
          }
          router.replace('/(tabs)');
        } catch (profileError) {
          console.warn('Profile fetch failed, using basic user data:', profileError);
          setUser(baseUser as any);
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Error', error.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  // Dev-only direct login helper
  const devDirectLogin = async () => {
    try {
      setLoading(true);
      // Skip authentication entirely - backend under construction
      router.replace('/(tabs)');
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
        

        {__DEV__ && ENABLE_DEV_LOGIN && (
          <TouchableOpacity
            onPress={devDirectLogin}
            disabled={loading}
            className="bg-yellow-400 p-3 rounded-xl items-center justify-center shadow-sm mt-3"
          >
            <Text className="text-black font-semibold">Dev: Direct Login</Text>
          </TouchableOpacity>
        )}

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
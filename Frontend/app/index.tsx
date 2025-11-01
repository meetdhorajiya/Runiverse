import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { useEffect } from "react";
import axios from "axios";
import { authService } from "@/services/AuthService";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// Provide a fallback demo video URL if env not set. Replace with your own.
// const VIDEO_URL = process.env.EXPO_PUBLIC_WELCOME_VIDEO_URL || 'https://static-assets.mapbox.com/www/videos/mobile-maps-sdk/section_hero/video@720p.webm';
const VIDEO_URL = 'https://drive.google.com/uc?export=download&id=1Z1CW9f6LJ3wJ8xJY4fdodDxTRvEAzjp7';

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const videoRef = useRef<Video | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        await authService.hydrate();
        const token = authService.getToken();
        if (token && isMounted) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView className={isDarkMode ? 'flex-1 bg-background-dark' : 'flex-1 bg-black'}>
      <View className="flex-1">
        {/* Background Video */}
        <Video
          ref={videoRef}
          source={{ uri: VIDEO_URL }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onError={(e) => console.warn('Video error', e)}
        />

        {/* Darken + vignette overlays */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.40)', 'rgba(0,0,0,1)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents='none' style={styles.vignette} />

        {/* Content */}
        <View className="flex-1 p-6 justify-end">
          <Animated.View 
            entering={FadeInUp.duration(800).delay(200)}
            className="mb-12" 
            style={{ gap: 14 }}
          >
            <Text className="text-5xl font-bold text-white leading-tight tracking-tight">
              Run. Conquer.
              {"\n"}Own Your World.
            </Text>
            <Text className="text-lg text-gray-300 leading-relaxed">
              Transform every step into progress. Capture territory, climb leaderboards and grow stronger with the community that runs the Runiverse.
            </Text>
            <Text className="text-xs uppercase tracking-widest text-gray-400 font-medium">
              Seamless tracking • Territory strategy • Social motivation
            </Text>
          </Animated.View>

          {/* Progress indicators + CTA */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(400)}
            className="flex-row justify-between items-center mb-2"
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View className="h-2 w-8 bg-primary-green rounded-full shadow-sm shadow-primary-green/50" />
              <View className="h-2 w-2 bg-neutral-400/50 rounded-full" />
              <View className="h-2 w-2 bg-neutral-400/30 rounded-full" />
            </View>
            <Pressable 
              onPress={() => router.push('/login')}
              className="bg-primary-green h-16 w-16 rounded-full items-center justify-center shadow-xl shadow-primary-green/40 active:scale-95"
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <FontAwesome name="arrow-right" size={26} color="black" />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    // radial-ish vignette using multiple shadows / gradient fallback (web/platform differences)
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 50,
  }
});
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "./global.css";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useState, useEffect } from "react";
import ReanimatedSplashScreen from '../components/ReanimatedSplashScreen';

// A separate component to handle the main app content
function AppContent() {
  const { theme } = useTheme();
  
  return (
    <View className={theme === 'dark' ? "flex-1 bg-background-dark" : "flex-1 bg-white"}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
      </Stack>
      <StatusBar style={theme === 'dark' ? "light" : "dark"} />
    </View>
  );
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // Show the animation for 2.5 seconds
    setTimeout(() => {
      setIsAppReady(true);
    }, 2500);
  }, []);
  
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {isAppReady ? <AppContent /> : <ReanimatedSplashScreen />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
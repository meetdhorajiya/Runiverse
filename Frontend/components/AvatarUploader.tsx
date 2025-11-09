// src/components/AvatarUploader.tsx
import React, { useEffect } from "react";
import { View, Image, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useAvatar } from "../hooks/useAvatar";
import { FontAwesome } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedImage = Animated.createAnimatedComponent(Image);

export function AvatarUploader({ initialUrl }: { initialUrl?: string }) {
  const { avatarUrl, loading, pickAndUploadAvatar, deleteAvatar } = useAvatar(initialUrl);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    scale.value = 0.82;
    scale.value = withSpring(1, { damping: 12, stiffness: 160, mass: 0.7 });
  }, [avatarUrl, scale]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="items-center my-6">
      {loading ? (
        <ActivityIndicator size="large" color="#00C853" />
      ) : (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(220)} style={avatarStyle}>
          {avatarUrl ? (
            <AnimatedTouchable onLongPress={deleteAvatar} activeOpacity={0.8}>
              <AnimatedImage
                source={{ uri: avatarUrl }}
                className="w-32 h-32 rounded-full border-4 border-green-500"
                entering={FadeIn.duration(250)}
                exiting={FadeOut.duration(180)}
              />
              <Text className="text-gray-400 text-xs mt-2">(Hold to remove)</Text>
            </AnimatedTouchable>
          ) : (
            <AnimatedTouchable
              onPress={pickAndUploadAvatar}
              className="w-32 h-32 rounded-full bg-gray-700 items-center justify-center"
              activeOpacity={0.85}
            >
              <FontAwesome name="camera" size={30} color="#aaa" />
              <Text className="text-gray-400 text-xs mt-2">Add Avatar</Text>
            </AnimatedTouchable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

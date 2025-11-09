import { useEffect } from "react";
import Animated, { Easing, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Smoothly animates progress changes for bars or loaders.
 * @param value - current progress (0–100)
 * @returns shared value (use with useAnimatedStyle to derive width/opacity)
 */
export const useProgressAnimation = (value: number) => {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedValue, value]);

  return animatedValue;
};

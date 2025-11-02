import React, { useEffect } from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const ReanimatedSplashScreen = () => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.85);
  const glow = useSharedValue(0);
  const backdrop = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.25]) }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0.2, 0.45]),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  useEffect(() => {
    opacity.value = withDelay(120, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }));
    translateY.value = withTiming(0, { duration: 820, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    glow.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    backdrop.value = withTiming(1, { duration: 680, easing: Easing.linear });
  }, [backdrop, glow, opacity, scale, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <LinearGradient
          colors={["#0f172a", "#1e293b", "#111827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.pulse, haloStyle]} />
      </Animated.View>

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image source={require("../assets/images/logo.png")} style={styles.logo} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#030712",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pulse: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width,
    alignSelf: "center",
    backgroundColor: "rgba(0, 200, 131, 0.24)",
    shadowColor: "rgba(123, 104, 238, 0.8)",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 48,
    elevation: 12,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: "contain",
  },
});

export default ReanimatedSplashScreen;
import React, { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';

// By extending `TextInputProps`, we can accept all the standard props
// for a `TextInput` component, including `keyboardType` and `secureTextEntry`.
interface CustomInputProps extends TextInputProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

export default function CustomInput({
  iconName,
  ...rest // Use the 'rest' operator to gather all other props
}: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(0, 200, 83, 0)', 'rgba(0, 200, 83, 1)']
    );

    return {
      borderColor,
      transform: [{ scale: withTiming(isFocused ? 1.01 : 1, { duration: 200 }) }],
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  return (
    <Animated.View 
      style={containerStyle}
      className="flex-row items-center bg-input-bg rounded-xl p-4 my-2 border-2 shadow-sm"
    >
      <MaterialCommunityIcons
        name={iconName}
        size={22}
        color={isFocused ? "#00C853" : "#8E8E93"}
        style={{ marginRight: 12 }}
      />
      <TextInput
        className="flex-1 text-text-primary text-base"
        placeholderTextColor="#9CA3AF"
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest} // Pass all other props down to the underlying TextInput
      />
    </Animated.View>
  );
}
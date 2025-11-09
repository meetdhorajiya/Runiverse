import { StyledText, StyledView } from "./Styled";
import { Challenge } from "@/store/types";
import Animated, { FadeInDown, useAnimatedStyle } from "react-native-reanimated";
import { useProgressAnimation } from "@/hooks/useProgressAnimation";

export function ChallengeCard({ challenge, index = 0 }: { challenge: Challenge; index?: number }) {
  const progressPercent = challenge.goal ? (challenge.currentProgress / challenge.goal) * 100 : 0;
  const animatedProgress = useProgressAnimation(progressPercent);
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.max(Math.min(animatedProgress.value, 100), 0)}%`,
  }));
  return (
    <Animated.View
      entering={FadeInDown.duration(450).delay(index * 60)}
      className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-4"
      style={{
        shadowColor: "#6A5ACD",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <StyledView className="flex-row justify-between items-center">
        <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
          {challenge.title ?? "Untitled Challenge"}
        </StyledText>
      </StyledView>
      <StyledText className="text-subtle-light dark:text-subtle-dark mt-1">
        {challenge.description ?? ""}
      </StyledText>
      <StyledView className="w-full bg-border-light dark:bg-border-dark rounded-full h-2.5 mt-4 overflow-hidden">
        <Animated.View className="bg-primary h-2.5 rounded-full" style={progressBarStyle} />
      </StyledView>
      <StyledText className="text-right text-xs text-subtle-light dark:text-subtle-dark mt-1">
        {Math.round(challenge.currentProgress)} / {challenge.goal}
      </StyledText>
    </Animated.View>
  );
}
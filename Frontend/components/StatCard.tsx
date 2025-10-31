import { StyledText, StyledView } from "./Styled";
import { LucideIcon } from "lucide-react-native";
import Animated, { 
   FadeInDown, 
   FadeInLeft
} from 'react-native-reanimated';

interface StatCardProps {
   icon: LucideIcon;
   label: string;
   value: string;
   index?: number;
   variant?: 'horizontal' | 'vertical';
}

export function StatCard({ icon: Icon, label, value, index = 0, variant = 'vertical' }: StatCardProps) {
   // Horizontal layout for featured card
   if (variant === 'horizontal') {
      return (
         <Animated.View 
            entering={FadeInLeft.duration(600).delay(index * 100)}
            className="flex-row items-center p-6 bg-card-light dark:bg-card-dark rounded-3xl"
            style={{
               borderWidth: 0.5,
               borderColor: 'rgba(106, 90, 205, 0.3)',
            }}
         >
               <StyledView 
                  className="p-5 rounded-3xl mr-5" 
                  style={{
                     // backgroundColor: 'rgba(106, 90, 205, 0.12)',
                     // shadowColor: '#6A5ACD',
                     // shadowOffset: { width: 0, height: 4 },
                     // shadowOpacity: 0.2,
                     // shadowRadius: 8,
                     // elevation: 4,
                  }}
               >
                  <Icon color="#6A5ACD" size={36} strokeWidth={2.5} />
               </StyledView>
               <StyledView className="flex-1">
                  <StyledText className="text-xs text-subtle-light dark:text-subtle-dark uppercase tracking-wide font-semibold mb-1">
                     {label}
                  </StyledText>
                  <StyledText 
                     className="text-4xl font-bold text-text-light dark:text-text-dark tracking-tight"
                     style={{
                        textShadowColor: 'rgba(0, 0, 0, 0.05)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                     }}
                  >
                     {value}
                  </StyledText>
               </StyledView>
         </Animated.View>
      );
   }
   
   // Vertical layout for compact cards
   return (
      <Animated.View 
         entering={FadeInDown.duration(600).delay(index * 100)}
         className="items-center p-5 mx-2 bg-card-light dark:bg-card-dark rounded-3xl"
         style={{
            borderWidth: 0.5,
            borderColor: 'rgba(106, 90, 205, 0.3)',
         }}
      >
            <StyledView 
               className="p-4 rounded-2xl mb-3" 
               style={{
                  // backgroundColor: 'rgba(106, 90, 205, 0.12)',
                  // shadowColor: '#6A5ACD',
                  // shadowOffset: { width: 0, height: 4 },
                  // shadowOpacity: 0.2,
                  // shadowRadius: 8,
                  // elevation: 4,
               }}
            >
               <Icon color="#6A5ACD" size={28} strokeWidth={2.5} />
            </StyledView>
            <StyledText 
               className="text-2xl font-bold mt-1 text-text-light dark:text-text-dark tracking-tight"
               style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.05)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
               }}
            >
               {value}
            </StyledText>
            <StyledText className="text-xs text-subtle-light dark:text-subtle-dark mt-1 text-center uppercase tracking-wide font-semibold">
               {label}
            </StyledText>
      </Animated.View>
   );
}
// import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
// import { StatCard } from "@/components/StatCard";
// import { Footprints, MapPin, Flame } from "lucide-react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useState, useEffect } from "react";
// // import { usePedometer } from "@/services/pedometerService";
// import { Pedometer } from 'expo-sensors';

// const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m per step
// const estimateCalories = (steps: number) => Math.round(steps * 0.04); // rough avg

// export default function Index() {
//    // Custom hook (baseline + today estimate)
//    const { steps, totalToday, isAvailable, resetBaseline } = usePedometer();
//    // Raw pedometer snippet integration
//    const [isPedometerAvailable, setIsPedometerAvailable] = useState<'checking' | 'true' | 'false'>('checking');
//    const [past24hSteps, setPast24hSteps] = useState(0);
//    const [currentRawStepCount, setCurrentRawStepCount] = useState(0);
//    const [isActive, setIsActive] = useState(true);

//    const handleToggleWalk = () => {
//       if (isActive) {
//          setIsActive(false);
//       } else {
//          resetBaseline();
//          setIsActive(true);
//       }
//    };

//    // Integrate raw pedometer logic (last 24h + live raw count)
//    useEffect(() => {
//       let subscription: { remove: () => void } | null = null;
//       let cancelled = false;
//       (async () => {
//          try {
//             const available = await Pedometer.isAvailableAsync();
//             if (cancelled) return;
//             setIsPedometerAvailable(available ? 'true' : 'false');
//             if (!available) return;

//             const end = new Date();
//             const start = new Date();
//             start.setDate(end.getDate() - 1); // last 24h
//             try {
//                const result = await Pedometer.getStepCountAsync(start, end);
//                if (!cancelled && result) setPast24hSteps(result.steps);
//             } catch {
//                // ignore query errors
//             }

//             subscription = Pedometer.watchStepCount(r => {
//                setCurrentRawStepCount(r.steps);
//             });
//          } catch {
//             if (!cancelled) setIsPedometerAvailable('false');
//          }
//       })();
//       return () => { cancelled = true; subscription && subscription.remove(); };
//    }, []);

//    return (
//       <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
//          <StyledView className="p-6">
//             <StyledText className="text-3xl font-bold text-text-light dark:text-text-dark">
//                Good Morning, PlayerOne!
//             </StyledText>
//             <StyledText className="text-md text-subtle-light dark:text-subtle-dark">
//                {isAvailable ? "Pedometer active" : "Pedometer not available"}
//             </StyledText>

//             <StyledView className="flex-row space-x-4 mt-6">
//                <StatCard
//                   icon={Footprints}
//                   label="Steps"
//                   value={isActive ? steps.toString() : totalToday.toString()}
//                />
//                <StatCard
//                   icon={MapPin}
//                   label="Distance (km)"
//                   value={isActive ? formatDistance(steps) : formatDistance(totalToday)}
//                />
//                <StatCard
//                   icon={Flame}
//                   label="Calories"
//                   value={isActive ? estimateCalories(steps).toString() : estimateCalories(totalToday).toString()}
//                />
//             </StyledView>

//             {/* Raw pedometer debug / integration section */}
//             <StyledView className="mt-6 space-y-1">
//                <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">
//                   Raw availability: {isPedometerAvailable}
//                </StyledText>
//                <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">
//                   Last 24h steps (query): {past24hSteps}
//                </StyledText>
//                <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">
//                   Live raw steps (since watcher attach): {currentRawStepCount}
//                </StyledText>
//             </StyledView>

//             <StyledView className="mt-8 items-center">
//                <StyledPressable
//                   className={`w-48 h-48 rounded-full items-center justify-center shadow-lg ${isActive ? 'bg-danger' : 'bg-primary'}`}
//                   onPress={handleToggleWalk}
//                >
//                   <StyledText className="text-white text-3xl font-bold">
//                      {isActive ? "STOP" : "START"}
//                   </StyledText>
//                </StyledPressable>
//             </StyledView>
//          </StyledView>
//       </SafeAreaView>
//    );
// }


// App.js
// import React, { useState, useEffect } from 'react';
// import { StyleSheet, Text, View, Platform, PermissionsAndroid } from 'react-native';
// import { Pedometer } from 'expo-sensors';

// export default function App() {
//    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking'); // 'checking' | 'yes' | 'no'
//    const [pastStepCount, setPastStepCount] = useState(0);
//    const [currentStepCount, setCurrentStepCount] = useState(0);

//    useEffect(() => {
//       let subscription = null;

//       async function initPedometer() {
//          try {
//             // Android runtime permission (Activity Recognition) for newer Android versions
//             if (Platform.OS === 'android' && Platform.Version >= 29) {
//                const granted = await PermissionsAndroid.request(
//                   PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
//                   {
//                      title: 'Activity permission',
//                      message: 'This app needs permission to access your physical activity to count steps.',
//                      buttonPositive: 'OK',
//                   }
//                );
//                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//                   setIsPedometerAvailable('no');
//                   return;
//                }
//             }

//             const available = await Pedometer.isAvailableAsync();
//             setIsPedometerAvailable(available ? 'yes' : 'no');
//             if (!available) return;

//             // get steps in the last 24 hours (start -> end)
//             const end = new Date();
//             const start = new Date();
//             start.setDate(end.getDate() - 1);
//             try {
//                const past = await Pedometer.getStepCountAsync(start, end);
//                setPastStepCount(past.steps ?? 0);
//             } catch (err) {
//                console.log('getStepCountAsync error:', err);
//                setPastStepCount(0);
//             }

//             // subscribe to live updates
//             subscription = Pedometer.watchStepCount(result => {
//                setCurrentStepCount(result.steps ?? 0);
//             });
//          } catch (err) {
//             console.log('Pedometer init error:', err);
//             setIsPedometerAvailable('no');
//          }
//       }

//       initPedometer();

//       // cleanup
//       return () => {
//          if (subscription && typeof subscription.remove === 'function') {
//             subscription.remove();
//          }
//       };
//    }, []);

//    return (
//       <View style={styles.container}>
//          <Text>Pedometer.isAvailableAsync(): {isPedometerAvailable}</Text>
//          <Text>Steps taken in the last 24 hours: {pastStepCount}</Text>
//          <Text>Walk! And watch this go up: {currentStepCount}</Text>

//          <Text style={styles.note}>
//             * Note: test on a real device — many simulators/emulators do not expose physical step sensors.
//          </Text>
//       </View>
//    );
// }

// const styles = StyleSheet.create({
//    container: {
//       flex: 1,
//       marginTop: 15,
//       alignItems: 'center',
//       justifyContent: 'center',
//    },
//    note: {
//       marginTop: 12,
//       fontSize: 12,
//       opacity: 0.8,
//       textAlign: 'center',
//       paddingHorizontal: 20,
//    },
// });

// Index.tsx
import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pedometer } from "expo-sensors";
import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
import { StatCard } from "@/components/StatCard";
import { Footprints, MapPin, Flame } from "lucide-react-native";

// rough estimations
const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m/step
const estimateCalories = (steps: number) => Math.round(steps * 0.04);   // ~0.04 cal/step

export default function Index() {
   const [isPedometerAvailable, setIsPedometerAvailable] = useState<
      "checking" | "yes" | "no"
   >("checking");

   const [past24hSteps, setPast24hSteps] = useState(0);       // history
   const [currentStepCount, setCurrentStepCount] = useState(0); // live session
   const [isActive, setIsActive] = useState(false);            // session toggle
   const [baseline, setBaseline] = useState(0);                // for session reset

   useEffect(() => {
      let subscription: { remove: () => void } | null = null;

      async function initPedometer() {
         try {
            // Android 10+ runtime permission
            if (Platform.OS === "android" && Platform.Version >= 29) {
               const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
                  {
                     title: "Activity Permission",
                     message:
                        "This app needs permission to access your physical activity to count steps.",
                     buttonPositive: "OK",
                  }
               );
               if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  setIsPedometerAvailable("no");
                  return;
               }
            }

            const available = await Pedometer.isAvailableAsync();
            setIsPedometerAvailable(available ? "yes" : "no");
            if (!available) return;

            // Get last 24h history
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 1);
            try {
               const past = await Pedometer.getStepCountAsync(start, end);
               setPast24hSteps(past.steps ?? 0);
            } catch (err) {
               console.log("getStepCountAsync error:", err);
               setPast24hSteps(0);
            }

            //  Subscribe to live updates
            subscription = Pedometer.watchStepCount((result) => {
               setCurrentStepCount(result.steps ?? 0);
            });
         } catch (err) {
            console.log("Pedometer init error:", err);
            setIsPedometerAvailable("no");
         }
      }

      initPedometer();

      // cleanup
      return () => {
         if (subscription && typeof subscription.remove === "function") {
            subscription.remove();
         }
      };
   }, []);

   // Toggle start/stop walking session
   const handleToggleWalk = () => {
      if (isActive) {
         setIsActive(false);
      } else {
         setBaseline(currentStepCount); // reset baseline
         setIsActive(true);
      }
   };

   //  Active session relative steps
   const sessionSteps = currentStepCount - baseline;
   const displaySteps = isActive ? sessionSteps : past24hSteps;

   return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
         <StyledView className="p-6">
            <StyledText className="text-3xl font-bold text-text-light dark:text-text-dark">
               Good Morning, PlayerOne!
            </StyledText>
            <StyledText className="text-md text-subtle-light dark:text-subtle-dark">
               {isPedometerAvailable === "yes"
                  ? "Pedometer active"
                  : "Pedometer not available"}
            </StyledText>

            <StyledView className="flex-row space-x-4 mt-6">
               <StatCard icon={Footprints} label="Steps" value={displaySteps.toString()} />
               <StatCard
                  icon={MapPin}
                  label="Distance (km)"
                  value={formatDistance(displaySteps)}
               />
               <StatCard
                  icon={Flame}
                  label="Calories"
                  value={estimateCalories(displaySteps).toString()}
               />
            </StyledView>

            {/* Debug info */}
            <StyledView className="mt-6 space-y-1">
               <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">
                  Raw total (24h): {past24hSteps}
               </StyledText>
               <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">
                  Live raw steps (since subscription): {currentStepCount}
               </StyledText>
            </StyledView>

            {/* Session button */}
            <StyledView className="mt-8 items-center">
               <StyledPressable
                  className={`w-48 h-48 rounded-full items-center justify-center shadow-lg ${isActive ? "bg-danger" : "bg-primary"
                     }`}
                  onPress={handleToggleWalk}
               >
                  <StyledText className="text-white text-3xl font-bold">
                     {isActive ? "STOP" : "START"}
                  </StyledText>
               </StyledPressable>
            </StyledView>
         </StyledView>
      </SafeAreaView>
   );
}

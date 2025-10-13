// Index.tsx
import { useState, useEffect, useRef } from "react";
import { Platform, PermissionsAndroid, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pedometer } from "expo-sensors";
import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
import { StatCard } from "@/components/StatCard";
import { Footprints, MapPin, Flame } from "lucide-react-native";
import { useStore } from "@/store/useStore";

// rough estimations
const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m/step
const estimateCalories = (steps: number) => Math.round(steps * 0.04);   // ~0.04 cal/step

// Dummy data for daily calorie burn to simulate a chart
// In a real app, this would come from persistent storage or an API.
const dummyDailyCalories = [
   { hour: "06", calories: 50 },
   { hour: "07", calories: 120 },
   { hour: "08", calories: 80 },
   { hour: "09", calories: 200 },
   { hour: "10", calories: 150 },
   { hour: "11", calories: 70 },
   { hour: "12", calories: 180 },
   { hour: "13", calories: 100 },
   { hour: "14", calories: 60 },
   { hour: "15", calories: 250 },
   { hour: "16", calories: 130 },
   { hour: "17", calories: 90 },
   { hour: "18", calories: 300 },
   { hour: "19", calories: 110 },
   { hour: "20", calories: 40 },
];

export default function Index() {
   const user = useStore((s) => s.user);
   const [isPedometerAvailable, setIsPedometerAvailable] = useState<
      "checking" | "yes" | "no"
   >("checking");

   const [initialTodaySteps, setInitialTodaySteps] = useState(0);    // Steps from midnight until app launch
   const [liveStepCount, setLiveStepCount] = useState(0);            // Raw data from the sensor listener
   const [totalTodaySteps, setTotalTodaySteps] = useState(0);      // The main value to display (initial + live)

   const [isActive, setIsActive] = useState(false);                  // session toggle
   const [baseline, setBaseline] = useState(0);                      // for session reset

   const lastReadingRef = useRef(0);

   useEffect(() => {
      let subscription: { remove: () => void } | null = null;

      async function initPedometer() {
         try {
            // Android 10+ runtime permission
            if (Platform.OS === "android" && Platform.Version >= 29) {
               const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
               );
               if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  setIsPedometerAvailable("no");
                  return;
               }
            }

            const available = await Pedometer.isAvailableAsync();
            setIsPedometerAvailable(available ? "yes" : "no");
            if (!available) return;

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            try {
               const past = await Pedometer.getStepCountAsync(startOfDay, now);
               const initialSteps = past.steps ?? 0;
               setInitialTodaySteps(initialSteps);
               setTotalTodaySteps(initialSteps); // Initialize total with historical data
               lastReadingRef.current = initialSteps; // Set initial last reading
            } catch (err) {
               console.log("getStepCountAsync error:", err);
            }

            // Subscribe to live updates
            subscription = Pedometer.watchStepCount((result) => {
               const rawSteps = result.steps ?? 0;
               setLiveStepCount(rawSteps);

               const delta = rawSteps - lastReadingRef.current;
               if (delta > 0) {
                  setTotalTodaySteps((prev) => prev + delta);
               }
               lastReadingRef.current = rawSteps;
            });
         } catch (err) {
            console.log("Pedometer init error:", err);
            setIsPedometerAvailable("no");
         }
      }

      initPedometer();

      return () => {
         if (subscription && typeof subscription.remove === "function") {
            subscription.remove();
         }
      };
   }, []);

   const handleToggleWalk = () => {
      if (isActive) {
         setIsActive(false);
      } else {
         setBaseline(liveStepCount);
         setIsActive(true);
      }
   };

   const sessionSteps = liveStepCount - baseline;

   // Determine the maximum calorie value for scaling the chart bars
   const maxCalories = Math.max(...dummyDailyCalories.map(d => d.calories));
   const chartHeight = 100; // Fixed height for the chart container

   return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
         <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <StyledView className="px-6 pt-6">
               <StyledView className="rounded-3xl p-6 bg-gradient-to-br from-primary/90 to-emerald-500 dark:from-primary dark:to-emerald-600 shadow-lg">
                  <StyledText className="text-xs uppercase tracking-widest text-white/80">
                     {isPedometerAvailable === "yes" ? "Daily Snapshot" : "Sensor Unavailable"}
                  </StyledText>
                  <StyledText className="mt-2 text-3xl font-bold text-white">
                     {user?.username ? `Welcome back, ${user.username}!` : "Welcome back!"}
                  </StyledText>
                  <StyledText className="mt-1 text-sm text-white/80">
                     {isPedometerAvailable === "yes"
                        ? "Keep moving—every step powers your Runiverse legend."
                        : "We couldn't access step data. Check permissions to stay in sync."}
                  </StyledText>
                  <StyledView className="mt-6 flex-row justify-between">
                     <StyledView>
                        <StyledText className="text-white/70 text-xs">Steps today</StyledText>
                        <StyledText className="text-2xl font-semibold text-white">{totalTodaySteps}</StyledText>
                     </StyledView>
                     <StyledView className="items-end">
                        <StyledText className="text-white/70 text-xs">Lifetime steps</StyledText>
                        <StyledText className="text-2xl font-semibold text-white">{user?.lifetimeSteps ?? 0}</StyledText>
                     </StyledView>
                  </StyledView>
               </StyledView>

               <StyledView className="mt-6 flex-row space-x-4">
                  <StatCard icon={Footprints} label="Steps" value={totalTodaySteps.toString()} />
                  <StatCard icon={MapPin} label="Distance" value={`${formatDistance(totalTodaySteps)} km`} />
                  <StatCard icon={Flame} label="Calories" value={estimateCalories(totalTodaySteps).toString()} />
               </StyledView>

               <StyledView className="mt-8 rounded-3xl p-6 bg-card-light dark:bg-card-dark shadow-md">
                  <StyledView className="flex-row justify-between items-center">
                     <StyledView>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           Today's Activity
                        </StyledText>
                        <StyledText className="text-xs text-subtle-light dark:text-subtle-dark mt-1">
                           Hourly calorie estimates based on movement
                        </StyledText>
                     </StyledView>
                     <StyledPressable className="px-3 py-1.5 rounded-full bg-primary/15">
                        <StyledText className="text-xs font-medium text-primary">
                           Auto-sync
                        </StyledText>
                     </StyledPressable>
                  </StyledView>
                  <StyledView className="mt-4 flex-row items-end justify-between h-[110px] bg-background-light/60 dark:bg-background-dark/60 rounded-2xl p-4">
                     {dummyDailyCalories.map((data, index) => (
                        <StyledView key={index} className="flex-col items-center mx-[1px]">
                           <StyledView
                              className="w-4 rounded-t-full bg-primary"
                              style={{ height: (data.calories / maxCalories) * chartHeight }}
                           />
                           <StyledText className="mt-1 text-[10px] text-subtle-light dark:text-subtle-dark">
                              {data.hour}
                           </StyledText>
                        </StyledView>
                     ))}
                  </StyledView>
               </StyledView>

               <StyledView className="mt-8 rounded-3xl p-5 bg-card-light dark:bg-card-dark shadow-md">
                  <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                     Session controls
                  </StyledText>
                  <StyledText className="mt-1 text-xs text-subtle-light dark:text-subtle-dark">
                     Tap start to track a focused walk. We'll keep counting even if you leave the screen.
                  </StyledText>

                  <StyledView className="mt-4 flex-row justify-between">
                     <StyledView>
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Live steps</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {liveStepCount}
                        </StyledText>
                     </StyledView>
                     <StyledView>
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Session steps</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {Math.max(sessionSteps, 0)}
                        </StyledText>
                     </StyledView>
                     <StyledView className="items-end">
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs">Baseline</StyledText>
                        <StyledText className="text-xl font-semibold text-text-light dark:text-text-dark">
                           {baseline}
                        </StyledText>
                     </StyledView>
                  </StyledView>

                  <StyledView className="mt-6 items-center">
                     <StyledPressable
                        className={`w-44 h-44 rounded-full items-center justify-center shadow-2xl transition-all ${
                           isActive ? "bg-danger" : "bg-primary"
                        }`}
                        onPress={handleToggleWalk}
                     >
                        <StyledText className="text-white text-3xl font-bold">
                           {isActive ? "STOP" : "START"}
                        </StyledText>
                     </StyledPressable>
                  </StyledView>

                  <StyledView className="mt-4 border border-dashed border-primary/30 rounded-2xl px-4 py-3">
                     <StyledText className="text-[11px] text-subtle-light dark:text-subtle-dark">
                        Raw total since midnight: {initialTodaySteps} steps • Sensor reading: {liveStepCount}
                     </StyledText>
                  </StyledView>
               </StyledView>
            </StyledView>
         </ScrollView>
      </SafeAreaView>
   );
}
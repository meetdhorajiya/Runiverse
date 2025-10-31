// Index.tsx
import { useState, useEffect, useRef } from "react";
import { Platform, PermissionsAndroid, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pedometer } from "expo-sensors";
import { StyledPressable, StyledText, StyledView } from "@/components/Styled";
import { StatCard } from "@/components/StatCard";
import { RouteHistoryCard } from "@/components/RouteHistoryCard";
import { Footprints, MapPin, Flame } from "lucide-react-native";
import { useStore } from "@/store/useStore";
import Animated, { 
   FadeInDown, 
   FadeInUp, 
   useAnimatedStyle, 
   useSharedValue, 
   withSpring, 
   withTiming, 
   interpolate,
   useAnimatedScrollHandler,
   Extrapolate,
   runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { routeHistoryService, RouteHistoryEntry } from "@/services/routeHistoryService";

// rough estimations
const formatDistance = (steps: number) => (steps * 0.0008).toFixed(2); // ~0.8m/step
const estimateCalories = (steps: number) => Math.round(steps * 0.04);   // ~0.04 cal/step

type DailyCaloriesEntry = {
   label: string;
   calories: number;
};

type HourlyCaloriesEntry = {
   label: string;
   calories: number;
};

const buildDailySkeleton = (): DailyCaloriesEntry[] => {
   const today = new Date();
   const days: DailyCaloriesEntry[] = [];
   for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const label = day.toLocaleDateString(undefined, {
         month: "short",
         day: "numeric",
      });
      days.push({ label, calories: 0 });
   }
   return days;
};

const buildHourlySkeleton = (): HourlyCaloriesEntry[] =>
   Array.from({ length: 24 }, (_unused, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      calories: 0,
   }));

type TodayMetricsSnapshot = {
   date: string;
   totalSteps: number;
   initialSteps: number;
   hourlyCalories: HourlyCaloriesEntry[];
   dailyCalories: DailyCaloriesEntry[];
};

const TODAY_SNAPSHOT_KEY = "runiverse:today-metrics";
const snapshotDelayMs = 300;

const getDayKey = (date: Date) => date.toISOString().split("T")[0];

const HEADER_HEIGHT = 280;
const STICKY_HEADER_HEIGHT = 70;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Index() {
   const user = useStore((s) => s.user);
   const [isPedometerAvailable, setIsPedometerAvailable] = useState<
      "checking" | "yes" | "no"
   >("checking");

   const [initialTodaySteps, setInitialTodaySteps] = useState(0);
   const [liveStepCount, setLiveStepCount] = useState(0);
   const [totalTodaySteps, setTotalTodaySteps] = useState(0);
   const [dailyCalories, setDailyCalories] = useState<DailyCaloriesEntry[]>([]);
   const [hourlyCalories, setHourlyCalories] = useState<HourlyCaloriesEntry[]>([]);
   const [isCaloriesExpanded, setIsCaloriesExpanded] = useState(false);
   const expandProgress = useSharedValue(0);
   const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false);
   const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const totalStepsRef = useRef(0);
   const latestSnapshotRef = useRef<TodayMetricsSnapshot | null>(null);
   const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);
   const [isLoadingRouteHistory, setIsLoadingRouteHistory] = useState(true);

   const [isActive, setIsActive] = useState(false);
   const [baseline, setBaseline] = useState(0);

   const lastReadingRef = useRef(0);
   
   // Scroll animation values
   const scrollY = useSharedValue(0);
   const [isHeaderSticky, setIsHeaderSticky] = useState(false);
   
   // Animated border pulse effect
   const borderPulse = useSharedValue(0);
   
   useEffect(() => {
      // Continuous pulsing animation for borders
      const animateBorder = () => {
         borderPulse.value = withTiming(1, { duration: 1500 }, () => {
            borderPulse.value = withTiming(0, { duration: 1500 });
         });
      };
      
      animateBorder();
      const interval = setInterval(animateBorder, 3000);
      
      return () => clearInterval(interval);
   }, []);

   const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
         scrollY.value = event.contentOffset.y;
         
         // Trigger sticky state at threshold
         if (event.contentOffset.y > HEADER_HEIGHT - STICKY_HEADER_HEIGHT) {
            if (!isHeaderSticky) {
               runOnJS(setIsHeaderSticky)(true);
            }
         } else {
            if (isHeaderSticky) {
               runOnJS(setIsHeaderSticky)(false);
            }
         }
      },
   });

   useEffect(() => {
      expandProgress.value = withTiming(isCaloriesExpanded ? 1 : 0, { duration: 300 });
   }, [isCaloriesExpanded, expandProgress]);

   useEffect(() => {
      // Restore the last known readings so dev reloads do not wipe today's totals
      const hydrateSnapshot = async () => {
         try {
            const serialized = await AsyncStorage.getItem(TODAY_SNAPSHOT_KEY);
            if (!serialized) {
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }
            const snapshot: TodayMetricsSnapshot = JSON.parse(serialized);
            const todayKey = getDayKey(new Date());
            if (snapshot.date !== todayKey) {
               await AsyncStorage.removeItem(TODAY_SNAPSHOT_KEY);
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               return;
            }

            setTotalTodaySteps(snapshot.totalSteps ?? 0);
            setInitialTodaySteps(snapshot.initialSteps ?? snapshot.totalSteps ?? 0);
            const hydratedHourly = Array.isArray(snapshot.hourlyCalories) && snapshot.hourlyCalories.length
               ? snapshot.hourlyCalories
               : buildHourlySkeleton();
            const hydratedDaily = Array.isArray(snapshot.dailyCalories) && snapshot.dailyCalories.length
               ? snapshot.dailyCalories
               : buildDailySkeleton();
            setHourlyCalories(hydratedHourly);
            setDailyCalories(hydratedDaily);

            totalStepsRef.current = snapshot.totalSteps ?? 0;
            lastReadingRef.current = snapshot.totalSteps ?? 0;
         } catch (err) {
            console.log("hydrate step snapshot failed:", err);
            setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
            setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
         } finally {
            setHasHydratedSnapshot(true);
         }
      };

      hydrateSnapshot();
   }, []);

   useEffect(() => {
      let isMounted = true;
      routeHistoryService
         .getRouteHistory()
         .then((entries) => {
            if (!isMounted) {
               return;
            }
            setRouteHistory(entries);
         })
         .catch((error) => {
            console.log("route history load failed:", error);
         })
         .finally(() => {
            if (isMounted) {
               setIsLoadingRouteHistory(false);
            }
         });

      return () => {
         isMounted = false;
      };
   }, []);

   useEffect(() => {
      if (!hasHydratedSnapshot) {
         return;
      }

   let subscription: { remove: () => void } | null = null;

      async function initPedometer() {
         try {
            if (typeof Pedometer.requestPermissionsAsync === "function") {
               try {
                  const { status } = await Pedometer.requestPermissionsAsync();
                  if (status !== "granted") {
                     setIsPedometerAvailable("no");
                     return;
                  }
               } catch (err) {
                  console.log("Pedometer permission request failed:", err);
               }
            }

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

            if (Platform.OS !== "android") {
               const now = new Date();
               const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               try {
                  const past = await Pedometer.getStepCountAsync(startOfDay, now);
                  const initialSteps = past.steps ?? 0;
                  setInitialTodaySteps((prev) => (initialSteps > prev ? initialSteps : prev));
                  setTotalTodaySteps((prev) => (initialSteps > prev ? initialSteps : prev)); // Initialize total with historical data
                  lastReadingRef.current = Math.max(lastReadingRef.current, initialSteps); // Set initial last reading
               } catch (err) {
                  console.log("getStepCountAsync error:", err);
               }
            } else {
               setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
            }

            const loadDailyCalories = async () => {
               if (Platform.OS === "android") {
                  setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
                  return;
               }
               try {
                  const days: DailyCaloriesEntry[] = [];
                  const today = new Date();
                  for (let offset = 6; offset >= 0; offset--) {
                     const dayStart = new Date(today);
                     dayStart.setHours(0, 0, 0, 0);
                     dayStart.setDate(dayStart.getDate() - offset);
                     const dayEnd = new Date(dayStart);
                     dayEnd.setDate(dayEnd.getDate() + 1);
                     const stepsForDay = await Pedometer.getStepCountAsync(dayStart, dayEnd);
                     const steps = stepsForDay?.steps ?? 0;
                     const label = dayStart.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                     });
                     days.push({ label, calories: estimateCalories(steps) });
                  }
                  setDailyCalories((prev) => {
                     if (!days.length) return prev;
                     const fallbackTotal = totalStepsRef.current;
                     const fallbackCalories = estimateCalories(fallbackTotal);

                     return days.map((entry, index) => {
                        const existing = prev.find((prevEntry) => prevEntry.label === entry.label);
                        if (index === days.length - 1) {
                           const best = Math.max(entry.calories, fallbackCalories, existing?.calories ?? 0);
                           return { ...entry, calories: best };
                        }
                        if (existing) {
                           return { ...entry, calories: Math.max(entry.calories, existing.calories) };
                        }
                        return entry;
                     });
                  });
               } catch (err) {
                  console.log("daily calories history error:", err);
                  setDailyCalories((prev) => (prev.length ? prev : buildDailySkeleton()));
               }
            };

            const loadHourlyCalories = async () => {
               if (Platform.OS === "android") {
                  setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
                  return;
               }
               try {
                  const now = new Date();
                  const hours: HourlyCaloriesEntry[] = [];
                  for (let hour = 0; hour < 24; hour++) {
                     const slotStart = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        hour,
                        0,
                        0,
                        0
                     );
                     const slotEnd = new Date(slotStart);
                     slotEnd.setHours(slotEnd.getHours() + 1);

                     let calories = 0;
                     if (slotStart < now) {
                        const effectiveEnd = slotEnd > now ? now : slotEnd;
                        try {
                           const stepsForHour = await Pedometer.getStepCountAsync(slotStart, effectiveEnd);
                           const steps = stepsForHour?.steps ?? 0;
                           calories = estimateCalories(steps);
                        } catch (err) {
                           console.log("hourly calories error:", err);
                        }
                     }

                     hours.push({
                        label: `${String(hour).padStart(2, "0")}:00`,
                        calories,
                     });
                  }
                  setHourlyCalories((prev) => {
                     if (!hours.length) return prev;
                     const previousLookup = new Map(prev.map((entry) => [entry.label, entry]));
                     return hours.map((entry) => {
                        const existing = previousLookup.get(entry.label);
                        return {
                           ...entry,
                           calories: Math.max(entry.calories, existing?.calories ?? 0),
                        };
                     });
                  });
               } catch (err) {
                  console.log("load hourly calories failed:", err);
                  setHourlyCalories((prev) => (prev.length ? prev : buildHourlySkeleton()));
               }
            };

            await loadDailyCalories();
            await loadHourlyCalories();

            // Subscribe to live updates
            subscription = Pedometer.watchStepCount((result) => {
               const rawSteps = result.steps ?? 0;
               setLiveStepCount(rawSteps);

               const delta = rawSteps - lastReadingRef.current;
               if (delta > 0) {
                  setTotalTodaySteps((prev) => {
                     const next = prev + delta;
                     setDailyCalories((entries) => {
                        if (!entries.length) return entries;
                        const updated = [...entries];
                        const lastIndex = updated.length - 1;
                        updated[lastIndex] = {
                           ...updated[lastIndex],
                           calories: estimateCalories(next),
                        };
                        return updated;
                     });
                     const deltaCalories = delta * 0.04;
                     setHourlyCalories((entries) => {
                        if (!entries.length) return entries;
                        const updated = [...entries];
                        const currentHour = new Date().getHours();
                        const previousEntry = updated[currentHour] ?? {
                           label: `${String(currentHour).padStart(2, "0")}:00`,
                           calories: 0,
                        };
                        updated[currentHour] = {
                           ...previousEntry,
                           calories: Math.max(0, Math.round(previousEntry.calories + deltaCalories)),
                        };
                        return updated;
                     });
                     return next;
                  });
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
   }, [hasHydratedSnapshot]);

   const handleToggleWalk = () => {
      if (isActive) {
         setIsActive(false);
      } else {
         setBaseline(liveStepCount);
         setIsActive(true);
      }
   };

   const sessionSteps = liveStepCount - baseline;

   const totalCaloriesToday = estimateCalories(totalTodaySteps);

   useEffect(() => {
      totalStepsRef.current = totalTodaySteps;
   }, [totalTodaySteps]);

   useEffect(() => {
      // Throttle persistence so we only write when readings settle
      if (!hasHydratedSnapshot) {
         return;
      }

   const todayKey = getDayKey(new Date());

      const snapshot: TodayMetricsSnapshot = {
         date: todayKey,
         totalSteps: totalTodaySteps,
         initialSteps: initialTodaySteps,
         hourlyCalories: [...hourlyCalories],
         dailyCalories: [...dailyCalories],
      };

      latestSnapshotRef.current = snapshot;

      if (persistTimeoutRef.current) {
         clearTimeout(persistTimeoutRef.current);
      }

      persistTimeoutRef.current = setTimeout(() => {
         AsyncStorage.setItem(TODAY_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch((err) => {
            console.log("persist step snapshot failed:", err);
         });
         persistTimeoutRef.current = null;
      }, snapshotDelayMs);

      return () => {
         if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
         }
      };
   }, [totalTodaySteps, initialTodaySteps, hourlyCalories, dailyCalories, hasHydratedSnapshot]);

   useEffect(() => {
      // Final safeguard to persist any in-flight data when the component unmounts
      return () => {
         if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = null;
         }
         if (latestSnapshotRef.current) {
            AsyncStorage.setItem(TODAY_SNAPSHOT_KEY, JSON.stringify(latestSnapshotRef.current)).catch((err) => {
               console.log("persist step snapshot on cleanup failed:", err);
            });
         }
      };
   }, []);

   // Determine the maximum calorie value for scaling the charts
   const maxDailyCalories = dailyCalories.length
      ? Math.max(...dailyCalories.map((d) => d.calories))
      : 0;
   const maxHourlyCalories = hourlyCalories.length
      ? Math.max(...hourlyCalories.map((d) => d.calories))
      : 0;
   const chartHeight = 120; // Fixed height for the chart container

   const expandedStyle = useAnimatedStyle(() => {
      const opacity = interpolate(expandProgress.value, [0, 1], [0, 1]);
      const translateY = interpolate(expandProgress.value, [0, 1], [-20, 0]);
      
      return {
         opacity,
         transform: [{ translateY }],
      };
   });

   // Animated styles for sticky header
   const stickyHeaderStyle = useAnimatedStyle(() => {
      const translateY = interpolate(
         scrollY.value,
         [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
         [HEADER_HEIGHT, 0],
         Extrapolate.CLAMP
      );

      const opacity = interpolate(
         scrollY.value,
         [HEADER_HEIGHT - STICKY_HEADER_HEIGHT - 50, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
         [0, 1],
         Extrapolate.CLAMP
      );

      return {
         transform: [{ translateY }],
         opacity,
      };
   });

   // Animated styles for main stats cards
   const statsCardsStyle = useAnimatedStyle(() => {
      const scale = interpolate(
         scrollY.value,
         [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
         [1, 0.7],
         Extrapolate.CLAMP
      );

      const translateY = interpolate(
         scrollY.value,
         [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
         [0, -50],
         Extrapolate.CLAMP
      );

      const opacity = interpolate(
         scrollY.value,
         [0, HEADER_HEIGHT - STICKY_HEADER_HEIGHT - 50, HEADER_HEIGHT - STICKY_HEADER_HEIGHT],
         [1, 0.5, 0],
         Extrapolate.CLAMP
      );

      return {
      };
   });

   return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
         {/* Sticky Header - Compact Stats Bar */}
         <Animated.View 
            style={[stickyHeaderStyle, { 
               position: 'absolute', 
               top: 32, 
               left: 12, 
               right: 12, 
               zIndex: 100,
               height: STICKY_HEADER_HEIGHT 
            }]}
            pointerEvents={isHeaderSticky ? 'auto' : 'none'}
         >
            <BlurView intensity={80} tint="default" className="flex-1 rounded-3xl overflow-hidden">
               <LinearGradient
                  colors={['rgba(106, 90, 205, 0.95)', 'rgba(0, 200, 83, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="flex-1 px-4 py-3 flex-row items-center justify-around"
               >
                  {/* Compact Step Count */}
                  <StyledView className="flex-row items-center">
                     <StyledView className="bg-white/20 p-2 rounded-xl mr-2">
                        <Footprints size={18} color="#fff" strokeWidth={2.5} />
                     </StyledView>
                     <StyledView>
                        <StyledText className="text-white/70 text-[10px] uppercase tracking-wide">Steps</StyledText>
                        <StyledText className="text-white text-base font-bold">{totalTodaySteps}</StyledText>
                     </StyledView>
                  </StyledView>

                  {/* Compact Distance */}
                  <StyledView className="flex-row items-center">
                     <StyledView className="bg-white/20 p-2 rounded-xl mr-2">
                        <MapPin size={18} color="#fff" strokeWidth={2.5} />
                     </StyledView>
                     <StyledView>
                        <StyledText className="text-white/70 text-[10px] uppercase tracking-wide">Distance</StyledText>
                        <StyledText className="text-white text-base font-bold">{formatDistance(totalTodaySteps)} km</StyledText>
                     </StyledView>
                  </StyledView>

                  {/* Compact Calories */}
                  <StyledView className="flex-row items-center">
                     <StyledView className="bg-white/20 p-2 rounded-xl mr-2">
                        <Flame size={18} color="#fff" strokeWidth={2.5} />
                     </StyledView>
                     <StyledView>
                        <StyledText className="text-white/70 text-[10px] uppercase tracking-wide">Calories</StyledText>
                        <StyledText className="text-white text-base font-bold">{estimateCalories(totalTodaySteps)}</StyledText>
                     </StyledView>
                  </StyledView>
               </LinearGradient>
            </BlurView>
         </Animated.View>

         <Animated.ScrollView 
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 24 }} 
            showsVerticalScrollIndicator={false}
         >
            <StyledView className="px-6 pt-6">
               <Animated.View entering={FadeInUp.duration(600).delay(100)}>
                  <StyledView className="rounded-3xl shadow-2xl" style={{ 
                     shadowColor: '#6A5ACD',
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: 0.3,
                     shadowRadius: 16,
                     elevation: 12,
                  }}>
                     <LinearGradient
                        colors={['#6A5ACD', '#7B68EE', '#00C853']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-3xl p-6 overflow-hidden"
                     >
                        {/* Content */}
                        <StyledView style={{ position: 'relative', zIndex: 1 }}>
                           <StyledView className="flex-row items-center mb-2">
                              <StyledView className="w-1 h-4 bg-white rounded-full mr-2" />
                              <StyledText className="text-xs uppercase tracking-widest text-white/90 font-bold">
                                 {isPedometerAvailable === "yes" ? "Daily Snapshot" : "Sensor Unavailable"}
                              </StyledText>
                           </StyledView>
                           
                           <StyledText className="mt-1 text-5xl font-black text-white tracking-tight leading-tight" style={{
                              textShadowColor: 'rgba(0, 0, 0, 0.3)',
                              textShadowOffset: { width: 0, height: 2 },
                              textShadowRadius: 8,
                           }}>
                              {user?.username ? `Hey, ${user.username}!` : "Welcome!"}
                           </StyledText>
                           
                           <StyledText className="mt-3 text-base text-white/95 leading-relaxed font-medium">
                              {isPedometerAvailable === "yes"
                                 ? "Every step brings you closer to your legend. Keep crushing it! 💪"
                                 : "We couldn't access step data. Check permissions to stay in sync."}
                           </StyledText>
                           
                           <StyledView className="mt-8 flex-row justify-between items-center">
                              {/* Steps Today Card */}
                              <StyledView className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 flex-1 mr-2" style={{
                              }}>
                                 <StyledView className="flex-row items-center mb-2">
                                    <Footprints size={16} color="#fff" strokeWidth={2.5} />
                                    <StyledText className="text-white/80 text-xs uppercase tracking-wider ml-2 font-semibold">Today</StyledText>
                                 </StyledView>
                                 <StyledText className="text-4xl font-black text-white" style={{
                                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                                    textShadowOffset: { width: 0, height: 1 },
                                    textShadowRadius: 4,
                                 }}>
                                    {totalTodaySteps.toLocaleString()}
                                 </StyledText>
                                 <StyledText className="text-white/70 text-xs mt-1 font-medium">steps</StyledText>
                              </StyledView>
                              
                              {/* Lifetime Steps Card */}
                              <StyledView className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 flex-1 ml-2" style={{
                              }}>
                                 <StyledView className="flex-row items-center mb-2">
                                    <Flame size={16} color="#FFD700" strokeWidth={2.5} />
                                    <StyledText className="text-white/80 text-xs uppercase tracking-wider ml-2 font-semibold">Lifetime</StyledText>
                                 </StyledView>
                                 <StyledText className="text-4xl font-black text-white" style={{
                                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                                    textShadowOffset: { width: 0, height: 1 },
                                    textShadowRadius: 4,
                                 }}>
                                    {(user?.lifetimeSteps ?? 0).toLocaleString()}
                                 </StyledText>
                                 <StyledText className="text-white/70 text-xs mt-1 font-medium">total steps</StyledText>
                              </StyledView>
                           </StyledView>
                        </StyledView>
                     </LinearGradient>
                  </StyledView>
               </Animated.View>

               {/* Redesigned Stats Layout - Mixed Shapes & Orientations */}
               <Animated.View style={statsCardsStyle} className="mt-6">
                  {/* Top Row - Steps (Large, Full Width, Horizontal) */}
                  <StyledView style={{
                     shadowColor: '#6A5ACD',
                     shadowOffset: { width: 0, height: 6 },
                     shadowOpacity: 0.25,
                     shadowRadius: 12,
                     elevation: 8,
                     marginBottom: 16,
                  }}>
                     <StatCard icon={Footprints} label="Steps" value={totalTodaySteps.toString()} index={0} variant="horizontal" />
                  </StyledView>

                  {/* Bottom Row - Distance & Calories (Side by Side, Vertical Cards) */}
                  <StyledView className="flex-row space-x-4">
                     <StyledView className="flex-1" style={{
                        shadowColor: '#00C853',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 8,
                     }}>
                        <StatCard icon={MapPin} label="Distance" value={`${formatDistance(totalTodaySteps)} km`} index={1} variant="vertical" />
                     </StyledView>
                     <StyledView className="flex-1" style={{
                        shadowColor: '#FF6B6B',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 8,
                     }}>
                        <StatCard icon={Flame} label="Calories" value={estimateCalories(totalTodaySteps).toString()} index={2} variant="vertical" />
                     </StyledView>
                  </StyledView>
               </Animated.View>

               <Animated.View entering={FadeInDown.duration(600).delay(300)} className="mt-8 rounded-3xl p-6 bg-card-light dark:bg-card-dark shadow-xl">
                  <StyledPressable
                     className="flex-row justify-between items-center active:opacity-70"
                     onPress={() => setIsCaloriesExpanded((prev) => !prev)}
                  >
                     <StyledView>
                        <StyledText className="text-xs uppercase tracking-widest text-subtle-light dark:text-subtle-dark font-medium">
                           Calories Burned Today
                        </StyledText>
                        <StyledText className="text-3xl font-bold text-text-light dark:text-text-dark mt-1 tracking-tight">
                           {totalCaloriesToday} kcal
                        </StyledText>
                     </StyledView>
                     <StyledView className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl">
                        <StyledText className="text-2xl text-primary">
                           {isCaloriesExpanded ? "▲" : "▼"}
                        </StyledText>
                     </StyledView>
                  </StyledPressable>

                  {isCaloriesExpanded && (
                     <Animated.View style={expandedStyle}>
                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center">
                              <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                                 Today's Calories by Hour
                              </StyledText>
                              <StyledText className="text-xs text-subtle-light dark:text-subtle-dark">
                                 Updated automatically
                              </StyledText>
                           </StyledView>
                           <StyledView className="mt-3 bg-background-light/60 dark:bg-background-dark/60 rounded-2xl p-4 overflow-hidden">
                              {hourlyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                                       Hourly data will appear once we record activity today.
                                    </StyledText>
                                 </StyledView>
                              ) : (
                                 <Animated.ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingRight: 16 }}
                                 >
                                    <StyledView className="flex-row items-end">
                                       {hourlyCalories.map((data, idx) => {
                                          const barHeight = maxHourlyCalories
                                             ? Math.max((data.calories / maxHourlyCalories) * chartHeight, 4)
                                             : 4;
                                          return (
                                             <Animated.View 
                                                key={data.label} 
                                                className="items-center mx-[4px]"
                                                entering={FadeInUp.duration(400).delay(idx * 50)}
                                             >
                                                <StyledText className="text-[10px] text-text-light dark:text-text-dark mb-1 font-semibold">
                                                   {data.calories}
                                                </StyledText>
                                                <LinearGradient
                                                   colors={['#00C853', '#6A5ACD']}
                                                   start={{ x: 0, y: 1 }}
                                                   end={{ x: 0, y: 0 }}
                                                   style={{ 
                                                      width: 12, 
                                                      height: barHeight,
                                                      borderTopLeftRadius: 8,
                                                      borderTopRightRadius: 8,
                                                   }}
                                                />
                                                <StyledText className="mt-1 text-[8px] text-subtle-light dark:text-subtle-dark font-medium">
                                                   {data.label}
                                                </StyledText>
                                             </Animated.View>
                                          );
                                       })}
                                    </StyledView>
                                 </Animated.ScrollView>
                              )}
                           </StyledView>
                        </StyledView>

                        <StyledView className="mt-6">
                           <StyledView className="flex-row justify-between items-center">
                              <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                                 Last 7 Days
                              </StyledText>
                              <StyledText className="text-xs text-subtle-light dark:text-subtle-dark">
                                 Daily calorie estimates
                              </StyledText>
                           </StyledView>
                           <StyledView className="mt-3 bg-background-light/60 dark:bg-background-dark/60 rounded-2xl p-4 overflow-hidden">
                              {dailyCalories.length === 0 ? (
                                 <StyledView className="py-6 items-center">
                                    <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                                       We'll chart your calories once we have enough movement data.
                                    </StyledText>
                                 </StyledView>
                              ) : (
                                 <StyledView className="flex-row justify-between items-end">
                                    {dailyCalories.map((data, idx) => {
                                       const barHeight = maxDailyCalories
                                          ? Math.max((data.calories / maxDailyCalories) * chartHeight, 6)
                                          : 6;
                                       return (
                                          <Animated.View 
                                             key={data.label} 
                                             className="items-center mx-[3px]"
                                             entering={FadeInUp.duration(500).delay(idx * 80)}
                                          >
                                             <StyledText className="text-xs font-bold text-text-light dark:text-text-dark mb-1">
                                                {data.calories}
                                             </StyledText>
                                             <LinearGradient
                                                colors={['#00C853', '#7B68EE']}
                                                start={{ x: 0, y: 1 }}
                                                end={{ x: 0, y: 0 }}
                                                style={{ 
                                                   width: 24, 
                                                   height: barHeight,
                                                   borderTopLeftRadius: 8,
                                                   borderTopRightRadius: 8,
                                                }}
                                             />
                                             <StyledText className="mt-1 text-[10px] text-subtle-light dark:text-subtle-dark font-semibold">
                                                {data.label}
                                             </StyledText>
                                          </Animated.View>
                                       );
                                    })}
                                 </StyledView>
                              )}
                           </StyledView>
                        </StyledView>
                     </Animated.View>
                  )}
               </Animated.View>

               <Animated.View entering={FadeInDown.duration(600).delay(340)} className="mt-8 rounded-3xl p-6 bg-card-light dark:bg-card-dark shadow-xl">
                  <StyledText className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">
                     Route History
                  </StyledText>
                  <StyledText className="mt-2 text-sm text-subtle-light dark:text-subtle-dark leading-relaxed">
                     Relive the shapes of your recent walks. Each card captures the polygon you covered and your total distance for that day.
                  </StyledText>

                  <StyledView className="mt-6">
                     {isLoadingRouteHistory ? (
                        <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                           Loading route history...
                        </StyledText>
                     ) : routeHistory.length === 0 ? (
                        <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">
                           Start logging walks to see your route history visualized here.
                        </StyledText>
                     ) : (
                        <Animated.ScrollView
                           horizontal
                           showsHorizontalScrollIndicator={false}
                           contentContainerStyle={{ paddingRight: 24 }}
                        >
                           {routeHistory.map((entry, idx) => (
                              <Animated.View
                                 key={entry.id}
                                 entering={FadeInUp.duration(500).delay(idx * 80)}
                                 style={{ marginRight: idx === routeHistory.length - 1 ? 0 : 16 }}
                              >
                                 <RouteHistoryCard entry={entry} />
                              </Animated.View>
                           ))}
                        </Animated.ScrollView>
                     )}
                  </StyledView>
               </Animated.View>

               <Animated.View entering={FadeInDown.duration(600).delay(400)} className="mt-8 rounded-3xl p-6 bg-card-light dark:bg-card-dark shadow-xl">
                  <StyledText className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">
                     Session Controls
                  </StyledText>
                  <StyledText className="mt-2 text-sm text-subtle-light dark:text-subtle-dark leading-relaxed">
                     Tap start to track a focused walk. We'll keep counting even if you leave the screen.
                  </StyledText>

                  <StyledView className="mt-6 flex-row justify-between">
                     <StyledView className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex-1 mr-2">
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs uppercase tracking-wide">Live steps</StyledText>
                        <StyledText className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">
                           {liveStepCount}
                        </StyledText>
                     </StyledView>
                     <StyledView className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl flex-1 mx-1">
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs uppercase tracking-wide">Session steps</StyledText>
                        <StyledText className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">
                           {Math.max(sessionSteps, 0)}
                        </StyledText>
                     </StyledView>
                     <StyledView className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl flex-1 ml-2">
                        <StyledText className="text-subtle-light dark:text-subtle-dark text-xs uppercase tracking-wide">Baseline</StyledText>
                        <StyledText className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">
                           {baseline}
                        </StyledText>
                     </StyledView>
                  </StyledView>

                  <StyledView className="mt-8 items-center">
                     <StyledPressable
                        className={`w-48 h-48 rounded-full items-center justify-center shadow-2xl active:scale-95 ${
                           isActive ? "bg-danger" : "bg-primary"
                        }`}
                        onPress={handleToggleWalk}
                        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                     >
                        <StyledText className="text-white text-4xl font-bold tracking-wider">
                           {isActive ? "STOP" : "START"}
                        </StyledText>
                        <StyledText className="text-white/80 text-sm mt-2 uppercase tracking-widest">
                           {isActive ? "Active" : "Ready"}
                        </StyledText>
                     </StyledPressable>
                  </StyledView>

                  <StyledView className="mt-6 border-2 border-dashed border-primary/20 rounded-2xl px-4 py-4 bg-primary/5">
                     <StyledText className="text-xs text-subtle-light dark:text-subtle-dark leading-relaxed">
                        Raw total since midnight: <StyledText className="font-bold">{initialTodaySteps}</StyledText> steps • Sensor reading: <StyledText className="font-bold">{liveStepCount}</StyledText>
                     </StyledText>
                  </StyledView>
               </Animated.View>
            </StyledView>
         </Animated.ScrollView>
      </SafeAreaView>
   );
}
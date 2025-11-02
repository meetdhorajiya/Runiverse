import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Mapbox, { Camera, MapView, UserLocation, ShapeSource, LineLayer, FillLayer, FillExtrusionLayer, VectorSource } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from "@/services/AuthService";
import {
   isClosedLoop,
   pathLengthMeters,
   polygonAreaMeters2,
} from "@/utils/loopDetection";
import { territoryService, TerritoryFeature } from "@/services/territoryService";
import { useStore } from "@/store/useStore";
import { Footprints, MapPin, Flame } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

type LocalRouteSnapshot = {
   date: string;
   route: [number, number][];
   startedAt: number | null;
};

const ROUTE_STORAGE_KEY = "runiverse:map:last-route";

Mapbox.setAccessToken(
   'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA'
);

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Mapbox Streets vector source + layer identifiers for 3D buildings
const BUILDING_SOURCE_ID = 'mapbox-buildings-source';
const BUILDING_3D_LAYER_ID = 'mapbox-buildings-3d';
const BUILDING_SHADOW_LAYER_ID = 'mapbox-buildings-shadows';

// Tracking tuning
const MIN_ACCURACY_METERS = 40;
const MIN_DISTANCE_DELTA_METERS = 2;
const MIN_TIME_BETWEEN_UPDATES_MS = 500;
const BASE_SMOOTHING_ALPHA = 0.22;
const MAX_SMOOTHING_SNAP_DISTANCE_METERS = 35;

// Helper functions
const formatDistance = (meters: number) => {
   if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
   }
   return `${Math.round(meters)} m`;
};

const estimateCalories = (meters: number) => {
   // Rough estimate: ~0.05 calories per meter walked
   return Math.round(meters * 0.05);
};

// Generate consistent color for a user based on their ID
const getUserColor = (userId: string | undefined, isCurrentUser: boolean): { fill: string; stroke: string; fillOpacity: number } => {
   if (isCurrentUser) {
      // Current user's territories in bright green
      return {
         fill: 'rgba(0, 255, 0, 0.5)',
         stroke: '#00FF00',
         fillOpacity: 0.5
      };
   }
   
   if (!userId) {
      // Unknown user - gray
      return {
         fill: 'rgba(128, 128, 128, 0.3)',
         stroke: '#808080',
         fillOpacity: 0.3
      };
   }
   
   // Generate consistent hue from userId
   let hash = 0;
   for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
   }
   
   const hue = Math.abs(hash % 360);
   const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
   const lightness = 50 + (Math.abs(hash >> 8) % 15); // 50-65%
   
   return {
      fill: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`,
      stroke: `hsl(${hue}, ${saturation}%, ${Math.max(lightness - 20, 30)}%)`,
      fillOpacity: 0.4
   };
};

export default function MapScreen() {
   const user = useStore((s) => s.user);
   const [location, setLocation] = useState<[number, number] | null>(null);
   const [route, setRoute] = useState<[number, number][]>([]);
   const [territories, setTerritories] = useState<TerritoryFeature[]>([]);
   const [showBuildings, setShowBuildings] = useState(true);
   const [routeDistance, setRouteDistance] = useState(0);
   const [userTerritoriesCount, setUserTerritoriesCount] = useState(0);
   const routeStartRef = useRef<number | null>(null);
   const routeRef = useRef<[number, number][]>([]);
   const cameraRef = useRef<Camera>(null);
   const watchRef = useRef<Location.LocationSubscription | null>(null);
   const prevAcceptedCoordRef = useRef<[number, number] | null>(null);
   const lastTimestampRef = useRef<number | null>(null);
   const hasCenteredRef = useRef(false);
   const insets = useSafeAreaInsets();

   const persistRoute = useCallback(async (coords: [number, number][]) => {
      try {
         if (!coords.length) {
            await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
            return;
         }

         const snapshot: LocalRouteSnapshot = {
            date: new Date().toISOString().slice(0, 10),
            route: coords,
            startedAt: routeStartRef.current ?? Date.now(),
         };

         await AsyncStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(snapshot));
      } catch (error) {
         console.warn("Failed to persist route", error);
      }
   }, []);

   const hydrateRoute = useCallback(async () => {
      try {
         const stored = await AsyncStorage.getItem(ROUTE_STORAGE_KEY);
         if (!stored) {
            return;
         }

         const parsed: LocalRouteSnapshot = JSON.parse(stored);
         const todayKey = new Date().toISOString().slice(0, 10);

         if (parsed.date !== todayKey || !Array.isArray(parsed.route)) {
            await AsyncStorage.removeItem(ROUTE_STORAGE_KEY);
            return;
         }

         routeRef.current = parsed.route;
         routeStartRef.current = typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now();
         setRoute(parsed.route);
      } catch (error) {
         console.warn("Failed to hydrate saved route", error);
      }
   }, []);

   const loadTerritories = useCallback(async () => {
      try {
         // Load ALL territories from all users (scope='all')
         const fetched = await territoryService.fetchTerritories('all');
         console.log(`📍 Loaded ${fetched.length} territories from backend (all users)`);
         setTerritories(fetched);
         
         // Count only current user's territories
         const userCount = fetched.filter(t => {
            const ownerId = t.properties?.owner?._id || t.properties?.owner?.id;
            return ownerId === user?.id;
         }).length;
         setUserTerritoriesCount(userCount);
         console.log(`👤 User owns ${userCount} territories`);
      } catch (error) {
         console.warn("Failed to load territories", error);
      }
   }, [user?.id]);

   const submitTerritory = useCallback(
      (closedPolygon: [number, number][], area: number, length: number) => {
         const localId = `local-${Date.now()}`;
         const optimistic: TerritoryFeature = {
            type: "Feature",
            geometry: {
               type: "Polygon",
               coordinates: [closedPolygon],
            },
            properties: {
               localId,
               area,
               length,
               claimedOn: new Date().toISOString(),
            },
         };

         setTerritories((prevT) => {
            const newTerritories = [...prevT, optimistic];
            setUserTerritoriesCount(prev => prev + 1);
            return newTerritories;
         });

         territoryService
            .claimTerritory({
               name: `Territory ${new Date().toISOString()}`,
               coordinates: closedPolygon,
               area,
               length,
            })
            .then((saved) => {
               console.log("✅ Territory saved successfully:", saved);
               setTerritories((prevT) =>
                  prevT.map((territory) =>
                     territory.properties?.localId === localId ? saved : territory
                  )
               );
               // Refresh territories from backend to ensure sync
               loadTerritories().catch(err => console.warn("Failed to reload territories:", err));
            })
            .catch((error) => {
               console.error("❌ Territory save failed:", error);
               alert(`Failed to save territory: ${error.message || 'Unknown error'}`);
               setTerritories((prevT) => {
                  const filtered = prevT.filter((territory) => territory.properties?.localId !== localId);
                  setUserTerritoriesCount(prev => Math.max(0, prev - 1));
                  return filtered;
               });
            });
      },
      [loadTerritories]
   );

   const handleLocationUpdate = useCallback(
      (loc: Location.LocationObject) => {
         const { accuracy } = loc.coords;
         const speed = loc.coords.speed ?? 0;

         if (accuracy && accuracy > MIN_ACCURACY_METERS) {
            return;
         }

         const timestamp = loc.timestamp ?? Date.now();
         if (lastTimestampRef.current && timestamp - lastTimestampRef.current < MIN_TIME_BETWEEN_UPDATES_MS) {
            return;
         }
         lastTimestampRef.current = timestamp;

         const rawCoord: [number, number] = [loc.coords.longitude, loc.coords.latitude];
         const prevAccepted = prevAcceptedCoordRef.current;
         const deltaToPrev = prevAccepted ? distance(prevAccepted, rawCoord) : undefined;
         const smoothingAlpha = getDynamicSmoothingAlpha(accuracy, deltaToPrev, speed);
         const smoothedCoord = smoothCoordinate(prevAccepted, rawCoord, smoothingAlpha);
         prevAcceptedCoordRef.current = smoothedCoord;
         setLocation(smoothedCoord);

         let nextRoute: [number, number][] | null = null;

         setRoute((prev) => {
            if (prev.length === 0) {
               routeStartRef.current = Date.now();
               nextRoute = [smoothedCoord];
               return nextRoute;
            }

            const lastCoord = prev[prev.length - 1];
            const distToLast = distance(lastCoord, smoothedCoord);

            if (distToLast < MIN_DISTANCE_DELTA_METERS) {
               nextRoute = prev;
               return prev;
            }

            const newPath = [...prev, smoothedCoord];

            if (isClosedLoop(newPath, routeStartRef.current)) {
               const area = polygonAreaMeters2(newPath);
               const MIN_AREA = 100;

               console.log(`🔄 Loop detected! Area: ${area.toFixed(2)}m², Min required: ${MIN_AREA}m²`);

               if (area > MIN_AREA) {
                  const closedPolygon = [...newPath, newPath[0]];
                  const length = pathLengthMeters(newPath);
                  console.log(`✅ Valid territory formed - Area: ${area.toFixed(2)}m², Length: ${length.toFixed(2)}m`);
                  submitTerritory(closedPolygon, area, length);
               } else {
                  console.log(`❌ Loop too small (${area.toFixed(2)}m² < ${MIN_AREA}m²) - ignoring`);
               }

               routeStartRef.current = null;
               nextRoute = [];
               return [];
            }

            nextRoute = newPath;
            return newPath;
         });

         if (nextRoute !== null) {
            const hasChanged = nextRoute !== routeRef.current;
            routeRef.current = nextRoute;
            if (hasChanged) {
               persistRoute(nextRoute);
            }
         }
      },
      [persistRoute, submitTerritory]
   );

   useEffect(() => {
      routeRef.current = route;
      // Calculate total route distance
      if (route.length > 1) {
         let totalDistance = 0;
         for (let i = 1; i < route.length; i++) {
            totalDistance += distance(route[i - 1], route[i]);
         }
         setRouteDistance(totalDistance);
      } else {
         setRouteDistance(0);
      }
   }, [route]);

   useEffect(() => {
      let isMounted = true;

      const startTracking = async () => {
         const { status } = await Location.requestForegroundPermissionsAsync();
         if (status !== "granted") {
            alert("Permission to access location was denied");
            return;
         }

         try {
            await Location.enableNetworkProviderAsync();
         } catch (err) {
            console.warn('Network provider enable failed', err);
         }

         watchRef.current?.remove();
         watchRef.current = await Location.watchPositionAsync(
            {
               accuracy: Location.Accuracy.BestForNavigation,
               timeInterval: MIN_TIME_BETWEEN_UPDATES_MS,
               distanceInterval: Math.max(1, MIN_DISTANCE_DELTA_METERS - 1),
               mayShowUserSettingsDialog: true,
            },
            (loc) => {
               if (!isMounted) return;
               handleLocationUpdate(loc);
            }
         );
      };

   authService.hydrate().catch(() => undefined);
   hydrateRoute();
      startTracking();
      loadTerritories();

      return () => {
         isMounted = false;
         watchRef.current?.remove();
         watchRef.current = null;
         void persistRoute(routeRef.current);
      };
   }, [handleLocationUpdate, hydrateRoute, loadTerritories, persistRoute]);

   useFocusEffect(
      useCallback(() => {
         loadTerritories();
         return () => {
            void persistRoute(routeRef.current);
         };
      }, [loadTerritories, persistRoute])
   );

   useEffect(() => {
      if (!location || !cameraRef.current) {
         return;
      }

      if (!hasCenteredRef.current) {
         cameraRef.current.setCamera({
            centerCoordinate: location,
            zoomLevel: 17,
            pitch: 60,
            heading: 0,
            animationDuration: 800,
         });
         hasCenteredRef.current = true;
      }
   }, [location]);
   return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['bottom', 'left', 'right']}>
         <StatusBar style="auto" />
         <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top + 8 }}>
            <MapView
               style={{ flex: 1 }}
               styleURL={MAPBOX_DARK_STYLE}
               compassEnabled={true}
               pitchEnabled={true}
               rotateEnabled={true}
               zoomEnabled={true}
               onDidFinishLoadingStyle={() => {
                  console.log('Dark map style loaded with custom 3D buildings');
               }}
            >
               {/* Global 3D Buildings from Mapbox Streets */}
               {showBuildings && (
                  <VectorSource id={BUILDING_SOURCE_ID} url="mapbox://mapbox.mapbox-streets-v8">
                     <FillExtrusionLayer
                        id={BUILDING_3D_LAYER_ID}
                        sourceID={BUILDING_SOURCE_ID}
                        sourceLayerID="building"
                        minZoomLevel={13}
                        maxZoomLevel={22}
                        style={{
                           fillExtrusionColor: [
                              'interpolate', ['linear'], ['get', 'height'],
                              0, '#4f5b66',
                              50, '#697887',
                              150, '#92a4b2'
                           ],
                           fillExtrusionHeight: [
                              'interpolate', ['linear'], ['zoom'],
                              13, 0,
                              13.05, ['coalesce', ['get', 'height'], 5],
                              18, ['*', ['coalesce', ['get', 'height'], 5], 1.5],
                              22, ['*', ['coalesce', ['get', 'height'], 5], 2]
                           ],
                           fillExtrusionBase: [
                              'coalesce', ['get', 'min_height'], 0
                           ],
                           fillExtrusionOpacity: 0.92,
                        }}
                     />
                     <FillLayer
                        id={BUILDING_SHADOW_LAYER_ID}
                        sourceID={BUILDING_SOURCE_ID}
                        sourceLayerID="building"
                        style={{
                           fillColor: '#000',
                           fillOpacity: [
                              'interpolate', ['linear'], ['zoom'],
                              13, 0,
                              14, 0.08,
                              17, 0.15
                           ],
                           fillTranslate: [6, 6],
                           fillTranslateAnchor: 'map'
                        }}
                     />
                  </VectorSource>
               )}

               {/* Current route line */}
               {route.length > 1 && (
                  <ShapeSource
                     id="routeSource"
                     shape={{
                        type: "Feature",
                        properties: {},
                        geometry: {
                           type: "LineString",
                           coordinates: route,
                        },
                     }}
                  >
                     <LineLayer
                        id="routeLine"
                        style={{
                           lineColor: '#00FF00',
                           lineWidth: 4,
                           lineOpacity: 0.8,
                        }}
                     />
                  </ShapeSource>
               )}
               {/* Territories */}
               {territories.map((territory, index) => {
                  const featureKey = territory.properties?.id ?? territory.properties?.localId ?? index;
                  const ownerId = territory.properties?.owner?._id || territory.properties?.owner?.id;
                  const isCurrentUser = ownerId === user?.id;
                  const colors = getUserColor(ownerId, isCurrentUser);
                  
                  return (
                     <ShapeSource key={`territory-${featureKey}`} id={`territory-${featureKey}`} shape={territory}>
                        <FillLayer
                           id={`territory-fill-${featureKey}`}
                           style={{
                              fillColor: colors.fill,
                              fillOutlineColor: colors.stroke,
                              fillOpacity: colors.fillOpacity,
                           }}
                        />
                        <LineLayer
                           id={`territory-line-${featureKey}`}
                           style={{
                              lineColor: colors.stroke,
                              lineWidth: isCurrentUser ? 4 : 3,
                              lineOpacity: isCurrentUser ? 1.0 : 0.8,
                           }}
                        />
                     </ShapeSource>
                  );
               })}

               {/* User */}
               <UserLocation
                  visible={true}
                  showsUserHeadingIndicator={true}
                  androidRenderMode="normal"
               />

               {/* Camera */}
               <Camera
                  ref={cameraRef}
                  followUserLocation
                  followZoomLevel={17}
                  followPitch={60}
                  followHeading={0}
                  animationMode="flyTo"
                  animationDuration={2000}
               />
            </MapView>

            <View style={[styles.controls, { left: insets.left + 16, top: insets.top + 20 }]}>
               <TouchableOpacity
                  style={[styles.toggleBtn, showBuildings && styles.toggleBtnActive]}
                  onPress={() => setShowBuildings(prev => !prev)}
               >
                  <Text style={styles.toggleText}>{showBuildings ? 'Hide 3D' : 'Show 3D'}</Text>
               </TouchableOpacity>
            </View>

            {/* Sticky Bottom Stats Bar */}
            <Animated.View 
               entering={FadeInDown.duration(800).delay(300)}
               style={[
                  styles.stickyBottomBar,
                  { 
                     bottom: insets.bottom + 8,
                     left: insets.left + 8,
                     right: insets.right + 8,
                  }
               ]}
            >
               <BlurView intensity={80} tint="dark" style={{ borderRadius: 24, overflow: 'hidden' }}>
                  <LinearGradient
                     colors={['rgba(106, 90, 205, 0.95)', 'rgba(0, 200, 83, 0.95)']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 0 }}
                     style={styles.gradientContainer}
                  >
                     {/* Distance Stat */}
                     <View style={styles.statItem}>
                        <View style={styles.iconContainer}>
                           <MapPin size={18} color="#fff" strokeWidth={2.5} />
                        </View>
                        <View>
                           <Text style={styles.statLabel}>Distance</Text>
                           <Text style={styles.statValue}>{formatDistance(routeDistance)}</Text>
                        </View>
                     </View>

                     {/* Territories Stat */}
                     <View style={styles.statItem}>
                        <View style={styles.iconContainer}>
                           <Flame size={18} color="#FFD700" strokeWidth={2.5} />
                        </View>
                        <View>
                           <Text style={styles.statLabel}>Your Territories</Text>
                           <Text style={styles.statValue}>{userTerritoriesCount}</Text>
                        </View>
                     </View>

                     {/* Calories Stat */}
                     <View style={styles.statItem}>
                        <View style={styles.iconContainer}>
                           <Footprints size={18} color="#fff" strokeWidth={2.5} />
                        </View>
                        <View>
                           <Text style={styles.statLabel}>Calories</Text>
                           <Text style={styles.statValue}>{estimateCalories(routeDistance)}</Text>
                        </View>
                     </View>
                  </LinearGradient>
               </BlurView>
            </Animated.View>
         </View>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   title: {
      fontSize: 22,
      margin: 12,
      fontWeight: "600",
   },
   fab: {
      position: "absolute",
      bottom: 20,
      top: 20,
      right: 20,
      backgroundColor: "#007AFF",
      borderRadius: 30,
      padding: 12,
      elevation: 4,
   },
   controls: {
      position: 'absolute',
      top: 12,
      left: 16,
      flexDirection: 'row',
      gap: 8,
   },
   toggleBtn: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: 'relative',
      top: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)'
   },
   toggleBtnActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF'
   },
   toggleText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600'
   },
   stickyBottomBar: {
      position: 'absolute',
      zIndex: 50,
   },
   gradientContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 24,
   },
   statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
   },
   iconContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      padding: 8,
      borderRadius: 12,
   },
   statLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
   },
   statValue: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
   },
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getDynamicSmoothingAlpha(accuracy?: number | null, deltaMeters?: number, speed?: number | null): number {
   const normalizedAccuracy = accuracy ? clamp(accuracy, 5, 60) : 30;
   const accuracyInfluence = 1 - (normalizedAccuracy - 5) / 55; // 5m => 1, 60m => ~0
   const movementInfluence = clamp((deltaMeters ?? 0) / 25, 0, 1);
   const speedInfluence = clamp((speed ?? 0) / 3, 0, 1);

   const alpha = BASE_SMOOTHING_ALPHA
      + 0.25 * accuracyInfluence
      - 0.1 * movementInfluence
      - 0.05 * speedInfluence;

   return clamp(alpha, 0.15, 0.55);
}

function smoothCoordinate(
   prev: [number, number] | null,
   next: [number, number],
   alpha: number,
   snapDistanceMeters: number = MAX_SMOOTHING_SNAP_DISTANCE_METERS
): [number, number] {
   if (!prev) {
      return next;
   }

   const travelMeters = distance(prev, next);
   if (travelMeters > snapDistanceMeters) {
      return next;
   }

   const clampedAlpha = clamp(alpha, 0.05, 0.7);
   const [prevLon, prevLat] = prev;
   const [nextLon, nextLat] = next;

   const lon = prevLon + clampedAlpha * (nextLon - prevLon);
   const lat = prevLat + clampedAlpha * (nextLat - prevLat);

   return [lon, lat];
}

// Reusing the distance function from loopDetection.ts (assuming it's exported)
function distance(coord1: [number, number], coord2: [number, number]): number {
   const [lon1, lat1] = coord1;
   const [lon2, lat2] = coord2;
   const R = 6371e3; // Earth radius in meters
   const φ1 = lat1 * Math.PI / 180;
   const φ2 = lat2 * Math.PI / 180;
   const Δφ = (lat2 - lat1) * Math.PI / 180;
   const Δλ = (lon2 - lon1) * Math.PI / 180;

   const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

   return R * c;
}
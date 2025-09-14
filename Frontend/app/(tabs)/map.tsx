import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Mapbox, { Camera, MapView, UserLocation, ShapeSource, LineLayer, FillLayer, FillExtrusionLayer } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons"; // Expo vector icons
import {
   isClosedLoop,
   haversineMeters,
   pathLengthMeters,
   polygonAreaMeters2,
} from "@/utils/loopDetection";

Mapbox.setAccessToken(
   'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA'
);

const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Style layer IDs we will insert relative to
const BUILDING_3D_LAYER_ID = 'runiverse-buildings-3d';
const BUILDING_SHADOW_LAYER_ID = 'runiverse-buildings-shadows';

export default function MapScreen() {
   const [location, setLocation] = useState<[number, number] | null>(null);
   const [route, setRoute] = useState<[number, number][]>([]);
   const [territories, setTerritories] = useState<any[]>([]);
   const [showBuildings, setShowBuildings] = useState(true);
   const routeStartRef = useRef<number | null>(null);
   const cameraRef = useRef<Camera>(null);

   useEffect(() => {
      (async () => {
         let { status } = await Location.requestForegroundPermissionsAsync();
         if (status !== "granted") {
            alert("Permission to access location was denied");
            return;
         }

         await Location.watchPositionAsync(
            {
               accuracy: Location.Accuracy.BestForNavigation, // best for walk tracking
               timeInterval: 1000,
               distanceInterval: 2,
            },
            (loc) => {
               const coords: [number, number] = [
                  loc.coords.longitude,
                  loc.coords.latitude,
               ];
               setLocation(coords);

               setRoute((prev) => {
                  if (prev.length === 0) {
                     routeStartRef.current = Date.now();
                  }

                  const newPath = [...prev, coords];
                  setRoute((prev) => [...prev, coords]);

                  if (isClosedLoop(newPath, routeStartRef.current)) {
                     setTerritories((prevT) => [
                        ...prevT,
                        {
                           type: "Feature",
                           geometry: {
                              type: "Polygon",
                              coordinates: [[...newPath, newPath[0]]],
                           },
                           properties: {
                              area: polygonAreaMeters2(newPath),
                              length: pathLengthMeters(newPath),
                           },
                        },
                     ]);
                     routeStartRef.current = null;
                     return [];
                  }

                  return newPath;
               });
            }
         );
      })();

   }, []);

   return (
      <SafeAreaView style={{ flex: 1 }}>
         <View style={{ flex: 1 }}>
            <MapView
               style={{ flex: 1 }}
               styleURL={MAPBOX_DARK_STYLE}

               compassEnabled={true}
               pitchEnabled={true}
               rotateEnabled={true}
               zoomEnabled={true}
               onDidFinishLoadingStyle={() => {
                  console.log('Dark map style loaded with 3D buildings');
               }}
            >
               {/* 3D Buildings */}
               {showBuildings && (
                  <>
                     <FillExtrusionLayer
                        id={BUILDING_3D_LAYER_ID}
                        sourceID="composite"
                        sourceLayerID="building"
                        filter={["all", ["==", ["get", "extrude"], "true"], ["has", "height"]]}
                        minZoomLevel={14}
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
                              14, 0,
                              14.05, ['coalesce', ['get', 'height'], 5],
                              22, ['*', ['coalesce', ['get', 'height'], 5], 1.2]
                           ],
                           fillExtrusionBase: [
                              'coalesce', ['get', 'min_height'], 0
                           ],
                           fillExtrusionOpacity: 0.92,
                        }}
                        belowLayerID="road-label"
                     />
                     <FillLayer
                        id={BUILDING_SHADOW_LAYER_ID}
                        sourceID="composite"
                        sourceLayerID="building"
                        filter={["==", ["get", "extrude"], "true"]}
                        style={{
                           fillColor: '#000',
                           fillOpacity: [
                              'interpolate', ['linear'], ['zoom'],
                              14, 0,
                              15, 0.08,
                              17, 0.15
                           ],
                           fillTranslate: [6, 6],
                           fillTranslateAnchor: 'map'
                        }}
                        belowLayerID={BUILDING_3D_LAYER_ID}
                     />
                  </>
               )}

               {/* Route line */}
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
                  ></ShapeSource>
               )}
               {/* Territories */}
               {territories.map((territory, index) => (
                  <ShapeSource key={`territory-${index}`} id={`territory-${index}`} shape={territory}>
                     <FillLayer
                        id={`territory-fill-${index}`}
                        style={{
                           fillColor: "rgba(255,0,0,0.4)",
                           fillOutlineColor: "red",
                        }}
                     />
                  </ShapeSource>
               ))}

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

            <View style={styles.controls}>
               <TouchableOpacity
                  style={[styles.toggleBtn, showBuildings && styles.toggleBtnActive]}
                  onPress={() => setShowBuildings(prev => !prev)}
               >
                  <Text style={styles.toggleText}>{showBuildings ? 'Hide 3D' : 'Show 3D'}</Text>
               </TouchableOpacity>
            </View>
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
      right: 20,
      backgroundColor: "#007AFF",
      borderRadius: 30,
      padding: 12,
      elevation: 4,
   },
   controls: {
      position: 'absolute',
      top: 16,
      right: 16,
      flexDirection: 'row',
      gap: 8,
   },
   toggleBtn: {
      backgroundColor: 'rgba(0,0,0,0.5)',
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
   }
});




// import React, { useEffect, useState } from 'react';
// import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
// import MapboxGL from '@rnmapbox/maps';
// import Constants from 'expo-constants';

// const mapboxToken = 'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA';
// if (mapboxToken) {
//    MapboxGL.setAccessToken('pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtZXhnemd6ODAwZXIyanF0ZWhqM3BrM2IifQ.Leh68KuE8z7Lm70Ce60NLA');
// }

// export default function MapScreen() {
//    const [ready, setReady] = useState(true);

//    if (!mapboxToken) {
//       return <View style={styles.center}><Text>Missing Mapbox token.</Text></View>;
//    }

//    return (
//       <View style={styles.page}>
//          {!ready && (
//             <View style={styles.loadingOverlay}>
//                <ActivityIndicator />
//                <Text>Loading map…</Text>
//             </View>
//          )}
//          <MapboxGL.MapView
//             style={styles.map}
//             styleURL="mapbox://styles/imagine-x/cmf6z2psu000101qufhfo3hqs"
//             onDidFinishRenderingMapFully={() => setReady(true)}
//          >
//             <MapboxGL.Camera
//                zoomLevel={14}
//                centerCoordinate={[72.8777, 19.076]}
//             />
//          </MapboxGL.MapView>
//       </View>
//    );
// }

// const styles = StyleSheet.create({
//    page: { flex: 1 },
//    map: { flex: 1 },
//    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
//    center: { flex: 1, alignItems: 'center', justifyContent: 'center' }
// });
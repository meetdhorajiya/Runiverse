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

export default function MapScreen() {
   const [location, setLocation] = useState<[number, number] | null>(null);
   const [route, setRoute] = useState<[number, number][]>([]);
   const [territories, setTerritories] = useState<any[]>([]);
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
               <FillExtrusionLayer
                  id="building-3d"
                  sourceID="composite"
                  sourceLayerID="building"
                  filter={['==', ['get', 'extrude'], 'true']}
                  minZoomLevel={0}
                  maxZoomLevel={22}
                  style={{
                     fillExtrusionColor: [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0, '#e0e0e0',
                        200, '#909090'
                     ],
                     fillExtrusionHeight: [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13, 0,
                        13.05, ['*', ['coalesce', ['get', 'height'], 10], 2.5],
                        22, ['*', ['coalesce', ['get', 'height'], 10], 2.5]
                     ],
                     fillExtrusionBase: [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13, 0,
                        13.05, ['coalesce', ['get', 'min_height'], 0],
                        22, ['coalesce', ['get', 'min_height'], 0]
                     ],
                     fillExtrusionOpacity: 0.9,
                  }}
                  belowLayerID="road-label"
               />

               {/* Shadows */}
               <FillLayer
                  id="building-shadows"
                  sourceID="composite"
                  sourceLayerID="building"
                  filter={['==', ['get', 'extrude'], 'true']}
                  style={{
                     fillColor: '#000000',
                     fillOpacity: [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13, 0,
                        14, 0.1,
                        16, 0.2
                     ],
                     fillTranslate: [5, 5],
                     fillTranslateAnchor: 'map'
                  }}
                  belowLayerID="building-3d"
               />

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

            {/* <TouchableOpacity style={styles.fab} onPress={centerOnUser}>
               <Ionicons name="locate" size={28} color="white" />
            </TouchableOpacity> */}
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
});

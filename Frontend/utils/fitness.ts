// Centralized fitness calculation helpers
// These values can later be personalized based on user profile (height, weight, age, gender)

export const DEFAULT_STRIDE_M = 0.78; // average adult walking stride length in meters
export const CALORIES_PER_STEP = 0.04; // rough average (adjust with MET formula for accuracy)

const EARTH_RADIUS_KM = 6371; // Average radius of Earth

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export function estimateDistanceFromSteps(steps: number, strideM: number = DEFAULT_STRIDE_M) {
  return steps * strideM; // meters
}

export function estimateCaloriesFromSteps(steps: number, calPerStep: number = CALORIES_PER_STEP) {
  return steps * calPerStep; // kcal
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (a: GeoCoordinate, b: GeoCoordinate): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const haversine = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));

  return EARTH_RADIUS_KM * c;
};

export function calculatePathDistanceKm(
  coordinates: GeoCoordinate[],
  closeLoop = false
): number {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 0;
  }

  let total = 0;
  for (let idx = 1; idx < coordinates.length; idx += 1) {
    total += haversineKm(coordinates[idx - 1], coordinates[idx]);
  }

  if (closeLoop && coordinates.length > 2) {
    total += haversineKm(coordinates[coordinates.length - 1], coordinates[0]);
  }

  return total;
}

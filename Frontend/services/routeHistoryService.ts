import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculatePathDistanceKm, GeoCoordinate } from "@/utils/fitness";
import territoryService, { TerritoryFeature } from "@/services/territoryService";

export interface RouteHistoryEntry {
  id: string;
  date: string; // ISO date string at local midnight
  coordinates: GeoCoordinate[];
  totalDistanceKm: number;
}

const STORAGE_KEY = "runiverse:route-history";
const MAX_HISTORY_ENTRIES = 14;
const CLOSE_LOOP_THRESHOLD = 1e-6;

type SeedRouteEntry = Omit<RouteHistoryEntry, "totalDistanceKm">;

const seedRouteHistory: SeedRouteEntry[] = [
  {
    id: "2025-10-31",
    date: "2025-10-31T00:00:00.000Z",
    coordinates: [
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7765, longitude: -122.4128 },
      { latitude: 37.7812, longitude: -122.4149 },
      { latitude: 37.7821, longitude: -122.4206 },
      { latitude: 37.7784, longitude: -122.4241 },
    ],
  },
  {
    id: "2025-10-30",
    date: "2025-10-30T00:00:00.000Z",
    coordinates: [
      { latitude: 37.7685, longitude: -122.4313 },
      { latitude: 37.7702, longitude: -122.4261 },
      { latitude: 37.7738, longitude: -122.4255 },
      { latitude: 37.7751, longitude: -122.4298 },
      { latitude: 37.7726, longitude: -122.4342 },
    ],
  },
  {
    id: "2025-10-29",
    date: "2025-10-29T00:00:00.000Z",
    coordinates: [
      { latitude: 37.7631, longitude: -122.4159 },
      { latitude: 37.7645, longitude: -122.4104 },
      { latitude: 37.7693, longitude: -122.4107 },
      { latitude: 37.7701, longitude: -122.4172 },
      { latitude: 37.7667, longitude: -122.4195 },
    ],
  },
  {
    id: "2025-10-28",
    date: "2025-10-28T00:00:00.000Z",
    coordinates: [
      { latitude: 37.785, longitude: -122.406 },
      { latitude: 37.7864, longitude: -122.4012 },
      { latitude: 37.7902, longitude: -122.4024 },
      { latitude: 37.7911, longitude: -122.4076 },
      { latitude: 37.7876, longitude: -122.4085 },
    ],
  },
  {
    id: "2025-10-27",
    date: "2025-10-27T00:00:00.000Z",
    coordinates: [
      { latitude: 37.7588, longitude: -122.4337 },
      { latitude: 37.7601, longitude: -122.4289 },
      { latitude: 37.7634, longitude: -122.4291 },
      { latitude: 37.7647, longitude: -122.4332 },
      { latitude: 37.7621, longitude: -122.4369 },
    ],
  },
];

const toIsoDayString = (value?: string | Date | null): string => {
  if (value instanceof Date) {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed.toISOString();
    }
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

const normalizeRingCoordinates = (ring: Array<[number, number]> | undefined): GeoCoordinate[] => {
  if (!Array.isArray(ring)) {
    return [];
  }

  const coords: GeoCoordinate[] = [];
  for (const pair of ring) {
    if (!pair || pair.length < 2) {
      continue;
    }
    const [longitude, latitude] = pair;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    coords.push({ latitude, longitude });
  }

  if (coords.length > 1) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (Math.abs(first.latitude - last.latitude) < CLOSE_LOOP_THRESHOLD &&
        Math.abs(first.longitude - last.longitude) < CLOSE_LOOP_THRESHOLD) {
      coords.pop();
    }
  }

  return coords;
};

const enrichWithDistance = (entry: SeedRouteEntry | RouteHistoryEntry): RouteHistoryEntry => {
  const totalDistance = calculatePathDistanceKm(entry.coordinates, true);
  return {
    ...entry,
    totalDistanceKm: Number(totalDistance.toFixed(2)),
  };
};

const toRouteEntryFromTerritory = (
  feature: TerritoryFeature,
  fallbackIndex: number
): RouteHistoryEntry | null => {
  const ring = feature?.geometry?.coordinates?.[0];
  const coordinates = normalizeRingCoordinates(ring as Array<[number, number]>);
  if (!coordinates.length) {
    return null;
  }

  const id =
    (feature?.properties?.id as string | undefined) ??
    (feature?.properties?.localId as string | undefined) ??
    `territory-${fallbackIndex}`;

  const dateIso = toIsoDayString(feature?.properties?.claimedOn ?? null);

  return enrichWithDistance({
    id,
    date: dateIso,
    coordinates,
  });
};

const readCachedEntries = async (): Promise<RouteHistoryEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: RouteHistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => enrichWithDistance(entry));
  } catch (error) {
    console.log("read cached route history failed:", error);
    return [];
  }
};

const cacheEntries = async (entries: RouteHistoryEntry[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.log("persist route history cache failed:", error);
  }
};

export const routeHistoryService = {
  async getRouteHistory(): Promise<RouteHistoryEntry[]> {
    try {
      const territories = await territoryService.fetchTerritories();
      const entries = territories
        .map((feature, index) => toRouteEntryFromTerritory(feature, index))
        .filter((entry): entry is RouteHistoryEntry => Boolean(entry))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_HISTORY_ENTRIES);

      if (entries.length) {
        await cacheEntries(entries);
        return entries;
      }

      const cached = await readCachedEntries();
      if (cached.length) {
        return cached
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, MAX_HISTORY_ENTRIES);
      }

      const fallback = seedRouteHistory
        .map(enrichWithDistance)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_HISTORY_ENTRIES);
      await cacheEntries(fallback);
      return fallback;
    } catch (error) {
      console.log("load route history failed:", error);
      const cached = await readCachedEntries();
      if (cached.length) {
        return cached
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, MAX_HISTORY_ENTRIES);
      }
      return seedRouteHistory
        .map(enrichWithDistance)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_HISTORY_ENTRIES);
    }
  },
};
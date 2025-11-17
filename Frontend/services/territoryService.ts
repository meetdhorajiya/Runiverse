import { api } from "./api";
import { authService } from "./AuthService";
import { polygonAreaMeters2, pathLengthMeters } from "@/utils/loopDetection";

export interface TerritoryFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: [Array<[number, number]>];
  };
  properties: {
    id?: string;
    name?: string;
    owner?: any;
    area?: number | null;
    perimeter?: number | null;
    claimedOn?: string | Date | null;
    localId?: string;
  };
}

export interface ClaimTerritoryPayload {
  name?: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  area?: number | null;
  perimeter?: number | null;
  processedPoints: Array<{ lon: number; lat: number; ts?: number }>;
  rawPoints: Array<{ lon: number; lat: number; ts?: number }>;
  encodedPolyline: string;
  deviceInfo?: {
    platform?: string;
    appVersion?: string;
  };
}

type ApiListResponse = { success: boolean; data: any[] } | any[];
type ApiSingleResponse = { success: boolean; data: any } | any;

const ensureClosedRing = (ring: [number, number][]): [number, number][] => {
  if (!ring.length) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, first];
};

const stripClosingVertex = (ring: [number, number][]): [number, number][] => {
  if (ring.length < 2) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, ring.length - 1);
  }
  return ring;
};

const territoryToFeature = (territory: any): TerritoryFeature => {
  const polygonSource = Array.isArray(territory?.geometry?.coordinates)
    ? territory.geometry.coordinates
    : Array.isArray(territory?.location?.coordinates)
      ? territory.location.coordinates
      : [];
  const polygonRing = polygonSource?.[0] ?? [];
  const closed = ensureClosedRing(polygonRing as [number, number][]);
  const workingRing = stripClosingVertex(closed);
  const area =
    typeof territory?.metrics?.area === "number"
      ? territory.metrics.area
      : typeof territory?.area === "number"
        ? territory.area
        : polygonAreaMeters2(workingRing as [number, number][]);
  const perimeter =
    typeof territory?.metrics?.perimeter === "number"
      ? territory.metrics.perimeter
      : typeof territory?.perimeter === "number"
        ? territory.perimeter
        : pathLengthMeters(workingRing as [number, number][]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [closed],
    },
    properties: {
      id: territory?._id ?? territory?.id,
      name: territory?.name ?? undefined,
      owner: territory?.owner ?? undefined,
      area,
      perimeter,
      claimedOn: territory?.claimedOn ?? null,
    },
  };
};

const unwrapListResponse = (response: ApiListResponse): any[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
};

const unwrapSingleResponse = (response: ApiSingleResponse): any => {
  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }
  return response;
};

export const territoryService = {
  async fetchTerritories(scope: "all" | "user" = "all"): Promise<TerritoryFeature[]> {
    try {
      await authService.hydrate();
      const token = authService.getToken() || undefined;
      const raw = await api.get<ApiListResponse>(`/api/territories?scope=${scope}`, token);
      return unwrapListResponse(raw).map(territoryToFeature);
    } catch (error) {
      console.error("Failed to fetch territories:", error);
      return [];
    }
  },

  async claimTerritory(payload: ClaimTerritoryPayload): Promise<TerritoryFeature> {
    await authService.hydrate();
    const token = authService.getToken() || undefined;
    const response = await api.post<ApiSingleResponse>("/api/territories/claim", payload, token);
    return territoryToFeature(unwrapSingleResponse(response));
  },
};

export default territoryService;

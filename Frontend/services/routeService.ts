import { api } from "./api";
import { authService } from "./AuthService";

export interface RoutePointPayload {
  lon: number;
  lat: number;
  ts?: number;
}

export interface SaveRoutePayload {
  rawPoints: RoutePointPayload[];
  processedPoints: RoutePointPayload[];
  encodedPolyline?: string;
  startedAt?: number | string | Date;
  endedAt?: number | string | Date;
  distanceMeters?: number;
  durationSeconds?: number;
}

export const routeService = {
  async saveRoute(payload: SaveRoutePayload) {
    await authService.hydrate();
    const token = authService.getToken() || undefined;
    return api.post("/api/routes/save", payload, token);
  },
};

export default routeService;

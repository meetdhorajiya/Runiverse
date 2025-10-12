import { api } from "./api";
import { authService } from "./AuthService";
import { useStore } from "@/store/useStore";

interface SyncStatsPayload {
  steps?: number;
  distance?: number;
}

interface SyncStatsResponse {
  msg: string;
  user: {
    id: string;
    steps: number;
    distance: number;
    lifetimeSteps?: number;
    lifetimeDistance?: number;
    territories?: number;
  };
}

export const statsService = {
  async syncStats(payload: SyncStatsPayload): Promise<SyncStatsResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const body: SyncStatsPayload = {};
    if (typeof payload.steps === "number" && payload.steps > 0) {
      body.steps = payload.steps;
    }
    if (typeof payload.distance === "number" && payload.distance > 0) {
      body.distance = payload.distance;
    }

    if (!body.steps && !body.distance) {
      return {
        msg: "Nothing to sync",
        user: {
          id: "",
          steps: 0,
          distance: 0,
        },
      };
    }

    const response = await api.put<SyncStatsResponse>("/api/users/me/sync-stats", body, token);

    const updateUser = useStore.getState().updateUser;
    if (typeof updateUser === "function") {
      updateUser({
        steps: response.user.steps,
        distance: response.user.distance,
        lifetimeSteps: response.user.lifetimeSteps,
        lifetimeDistance: response.user.lifetimeDistance,
      } as any);
    }

    return response;
  },
};

export default statsService;

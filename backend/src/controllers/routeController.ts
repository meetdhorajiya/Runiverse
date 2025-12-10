import type { Request, Response } from "express";
import Route, { type IRoutePoint } from "../models/Route.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface RoutePointInput {
  lat?: unknown;
  lon?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  ts?: unknown;
  recordedAt?: unknown;
  elevation?: unknown;
}

interface SaveRouteBody {
  rawPoints?: RoutePointInput[];
  processedPoints?: RoutePointInput[];
  encodedPolyline?: string;
  startedAt?: unknown;
  endedAt?: unknown;
  distanceMeters?: unknown;
  durationSeconds?: unknown;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toDate = (value: unknown): Date | null => {
  if (!value && value !== 0) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value === "string") {
    const fromString = new Date(value);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  }
  return null;
};

const normalizePointList = (input?: RoutePointInput[]): IRoutePoint[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((point) => {
      const latitude = toNumber(point.lat ?? point.latitude);
      const longitude = toNumber(point.lon ?? point.longitude);
      if (latitude === null || longitude === null) {
        return null;
      }

      const recordedAt = toDate(point.ts ?? point.recordedAt);
      const elevation = toNumber(point.elevation ?? null);

      const routePoint: IRoutePoint = {
        latitude,
        longitude,
        recordedAt,
      };

      if (elevation !== null) {
        routePoint.elevation = elevation;
      }

      return routePoint;
    })
    .filter((point): point is IRoutePoint => Boolean(point));
};

export const saveRoute = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const body = req.body as SaveRouteBody;

    const startedAt = toDate(body.startedAt);
    const endedAt = toDate(body.endedAt);
    const distanceMeters = toNumber(body.distanceMeters);
    const durationSeconds = toNumber(body.durationSeconds);

    if (!startedAt) {
      return res.status(400).json({ msg: "startedAt is required" });
    }

    if (distanceMeters === null) {
      return res.status(400).json({ msg: "distanceMeters is required" });
    }

    if (durationSeconds === null) {
      return res.status(400).json({ msg: "durationSeconds is required" });
    }

    if (distanceMeters < 0) {
      return res.status(400).json({ msg: "distanceMeters must be non-negative" });
    }

    if (durationSeconds < 0) {
      return res.status(400).json({ msg: "durationSeconds must be non-negative" });
    }

    const rawPoints = normalizePointList(body.rawPoints);
    const processedPoints = normalizePointList(body.processedPoints);
    const encodedPolyline =
      typeof body.encodedPolyline === "string" && body.encodedPolyline.trim().length > 0
        ? body.encodedPolyline.trim()
        : undefined;

    if (rawPoints.length === 0 && processedPoints.length === 0) {
      return res.status(400).json({ msg: "At least one of rawPoints or processedPoints must contain coordinates" });
    }

    const route = await Route.create({
      user: req.user._id,
      rawPoints,
      processedPoints,
      encodedPolyline,
      startedAt,
      endedAt,
      distanceMeters,
      durationSeconds,
    });

    return res.status(201).json({ success: true, data: route });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save route";
    console.error("Save route error:", error);
    return res.status(500).json({ success: false, msg: message });
  }
};

export default { saveRoute };

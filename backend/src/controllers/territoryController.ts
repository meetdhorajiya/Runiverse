import type { Request, Response } from "express";
import {
  computeAreaPerimeterFromRings,
  computeLineLengthMeters,
  sanitizeLineString,
  sanitizePolygonRings,
  dedupeConsecutive,
  closeRing,
} from "../utils/geometry.js";
import Territory, { type IDeviceInfo, type PolygonRings } from "../models/Territory.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

const toFiniteNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const sanitizeDeviceInfo = (raw: unknown): IDeviceInfo | undefined => {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const source = raw as Record<string, unknown>;
  const sanitized: Partial<IDeviceInfo> = {};

  if (typeof source.platform === "string" && source.platform.trim()) {
    sanitized.platform = source.platform.trim();
  }
  if (typeof source.model === "string" && source.model.trim()) {
    sanitized.model = source.model.trim();
  }
  if (typeof source.osVersion === "string" && source.osVersion.trim()) {
    sanitized.osVersion = source.osVersion.trim();
  }
  if (typeof source.appVersion === "string" && source.appVersion.trim()) {
    sanitized.appVersion = source.appVersion.trim();
  }

  const accuracy = toFiniteNumber(source.accuracyMeters ?? source.accuracy ?? source.horizontalAccuracy);
  if (accuracy !== null) {
    sanitized.accuracyMeters = accuracy;
  }

  if (typeof source.source === "string" && source.source.trim()) {
    sanitized.source = source.source.trim();
  }

  return Object.keys(sanitized).length > 0 ? (sanitized as IDeviceInfo) : undefined;
};

const isNewGeometryEnabled = (): boolean => {
  const flag = process.env.FEATURE_USE_NEW_GEOMETRY;
  if (!flag) {
    return true;
  }

  const lowered = flag.trim().toLowerCase();
  return lowered !== "false" && lowered !== "0" && lowered !== "off";
};

type ClaimBody = {
  polygonRings?: unknown;
  coordinates?: unknown;
  polyline?: unknown;
  name?: string;
  area?: unknown;
  perimeter?: unknown;
  length?: unknown;
  encodedPolyline?: unknown;
  claimedOn?: unknown;
  deviceInfo?: unknown;
};

const buildTerritoryCreatePayload = (
  req: AuthenticatedRequest,
  body: ClaimBody,
  sanitizedRings: PolygonRings | null,
  rawPoints: unknown,
  areaValue: number | null,
  perimeterValue: number | null
) => ({
  owner: req.user?._id ?? null,
  name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Unnamed Territory",
  geometry: sanitizedRings ? { type: "Polygon" as const, coordinates: sanitizedRings } : undefined,
  processedPoints: sanitizedRings ?? [],
  rawPoints,
  area: areaValue,
  perimeter: perimeterValue,
  encodedPolyline:
    typeof body.encodedPolyline === "string" && body.encodedPolyline.trim() ? body.encodedPolyline.trim() : undefined,
  claimedOn: toDate(body.claimedOn) ?? new Date(),
  deviceInfo: sanitizeDeviceInfo(body.deviceInfo),
});

const claimTerritoryModern = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const body = req.body as ClaimBody;

  const rawPolygon = Array.isArray(body.polygonRings) ? body.polygonRings : body.coordinates;
  const hasPolygonInput = Array.isArray(rawPolygon) && rawPolygon.length > 0;
  const sanitizedRings = sanitizePolygonRings(rawPolygon);
  const processedRings: PolygonRings | null = sanitizedRings ? (sanitizedRings as PolygonRings) : null;

  if (hasPolygonInput && !processedRings) {
    return res.status(400).json({ error: "Invalid polygon" });
  }

  const rawPolyline = body.polyline;
  const sanitizedPolyline = sanitizeLineString(rawPolyline);

  const metrics = processedRings ? computeAreaPerimeterFromRings(processedRings) : undefined;

  const areaValue = metrics && Number.isFinite(metrics.area) ? metrics.area : toFiniteNumber(body.area);

  let perimeterValue = metrics && Number.isFinite(metrics.perimeter) ? metrics.perimeter : null;

  if (perimeterValue === null && sanitizedPolyline) {
    const lengthFromLine = computeLineLengthMeters(sanitizedPolyline);
    if (Number.isFinite(lengthFromLine) && lengthFromLine > 0) {
      perimeterValue = lengthFromLine;
    }
  }

  if (perimeterValue === null) {
    perimeterValue = toFiniteNumber(body.perimeter ?? body.length);
  }

  const rawPointsValue = Array.isArray(rawPolyline)
    ? rawPolyline
    : Array.isArray(body.polygonRings)
      ? body.polygonRings
      : Array.isArray(rawPolygon)
        ? rawPolygon
        : [];

  try {
    const territory = await Territory.create(
      buildTerritoryCreatePayload(
        req,
        body,
        processedRings,
        rawPointsValue,
        areaValue ?? null,
        perimeterValue ?? null
      )
    );
    return res.json({ success: true, data: territory });
  } catch (dbError) {
    const error = dbError instanceof Error ? dbError : new Error(String(dbError));
    console.error("Territory creation failed", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save territory" });
  }
};

const claimTerritoryLegacy = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const body = req.body as ClaimBody;

  const rawCoordinates = body.coordinates;
  const hasCoordinates = Array.isArray(rawCoordinates) && rawCoordinates.length > 0;

  let processedRings: PolygonRings | null = null;
  let rawPointsForStorage: unknown = [];
  let metrics:
    | {
        area: number;
        perimeter: number;
      }
    | undefined;

  if (hasCoordinates) {
    const sanitizedRings = sanitizePolygonRings(rawCoordinates);

    if (!sanitizedRings) {
      return res.status(400).json({ success: false, message: "Invalid polygon coordinates provided" });
    }

    processedRings = sanitizedRings as PolygonRings;
    metrics = computeAreaPerimeterFromRings(processedRings);
    rawPointsForStorage = rawCoordinates;
  }

  const areaValue = metrics?.area ?? toFiniteNumber(body.area);
  let perimeterValue = metrics?.perimeter ?? null;

  if (perimeterValue === null) {
    perimeterValue = toFiniteNumber(body.perimeter ?? body.length);
  }

  if (!processedRings && perimeterValue === null) {
    return res.status(400).json({ success: false, message: "Polygon coordinates or perimeter length is required" });
  }

  try {
    const territory = await Territory.create(
      buildTerritoryCreatePayload(
        req,
        body,
        processedRings,
        rawPointsForStorage,
        areaValue ?? null,
        perimeterValue ?? null
      )
    );
    return res.json({ success: true, data: territory });
  } catch (dbError) {
    const error = dbError instanceof Error ? dbError : new Error(String(dbError));
    console.error("Territory creation failed", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save territory" });
  }
};

export const claimTerritory = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  if (isNewGeometryEnabled()) {
    return claimTerritoryModern(req, res);
  }
  return claimTerritoryLegacy(req, res);
};

export const getTerritories = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const scope = typeof req.query.scope === "string" ? req.query.scope : "all";

    let query: Record<string, unknown> = {};
    if (scope === "user" && req.user?._id) {
      query = { owner: req.user._id };
    }

    const territories = await Territory.find(query)
      .populate("owner", "username avatarUrl avatar")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: territories });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, message: error.message });
  }
};

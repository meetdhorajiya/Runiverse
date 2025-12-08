import type { Request, Response } from "express";
import Territory from "../models/Territory.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

type Coordinate = [number, number];
type PolygonRing = Coordinate[];

type NormalizedCoordinates = PolygonRing[];

const toFiniteNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isSamePoint = (a: Coordinate | undefined, b: Coordinate | undefined, tolerance = 1e-6): boolean => {
  if (!a || !b) {
    return false;
  }
  return Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;
};

const sanitizeRing = (ring: unknown): PolygonRing | null => {
  if (!Array.isArray(ring)) {
    return null;
  }

  const cleaned: PolygonRing = [];
  for (let i = 0; i < ring.length; i += 1) {
    const point = ring[i];
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }
    const lon = toFiniteNumber(point[0]);
    const lat = toFiniteNumber(point[1]);
    if (lon === null || lat === null) {
      continue;
    }
    cleaned.push([lon, lat]);
  }

  if (cleaned.length < 3) {
    return null;
  }

  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (!isSamePoint(first, last)) {
    cleaned.push([first[0], first[1]]);
  }

  if (cleaned.length < 4) {
    return null;
  }

  return cleaned;
};

const normalizePolygonCoordinates = (raw: unknown): NormalizedCoordinates | null => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const rings = raw
    .map((ring) => sanitizeRing(ring))
    .filter((ring): ring is PolygonRing => Boolean(ring));

  if (rings.length === 0) {
    return null;
  }

  return rings;
};

export const claimTerritory = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { coordinates, name, area, length } = req.body as {
      coordinates?: unknown;
      name?: string;
      area?: number;
      length?: number;
    };

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({ success: false, message: "Polygon coordinates are required" });
    }

    const normalizedCoordinates = normalizePolygonCoordinates(coordinates);

    if (!normalizedCoordinates) {
      return res.status(400).json({
        success: false,
        message: "Invalid polygon coordinates provided",
      });
    }

    const metrics = {
      area: typeof area === "number" ? area : null,
      length: typeof length === "number" ? length : null,
    };

    try {
      const territory = await Territory.create({
        owner: req.user?._id ?? null,
        location: { type: "Polygon", coordinates: normalizedCoordinates },
        name: name?.trim() || "Unnamed Territory",
        claimedOn: new Date(),
        metrics,
      });
      return res.json({ success: true, data: territory });
    } catch (dbError) {
      const error = dbError instanceof Error ? dbError : new Error(String(dbError));
      console.error("Territory creation failed", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save territory",
      });
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("claimTerritory error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
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

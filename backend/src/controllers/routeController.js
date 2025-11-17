import Route from "../models/Route.js";

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toOptionalDate = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizePointSeries = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .map((pt) => {
      if (!pt) {
        return null;
      }
      const lon = toFiniteNumber(pt.lon ?? pt.longitude ?? pt[0]);
      const lat = toFiniteNumber(pt.lat ?? pt.latitude ?? pt[1]);
      if (lon === null || lat === null) {
        return null;
      }
      const ts = toOptionalDate(pt.ts ?? pt.timestamp);
      return ts ? { lon, lat, ts } : { lon, lat };
    })
    .filter(Boolean);
};

export const saveRoute = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Authentication is required" });
    }

    const processedPoints = normalizePointSeries(req.body.processedPoints);
    const rawPoints = normalizePointSeries(req.body.rawPoints);

    if (!processedPoints.length && !rawPoints.length) {
      return res.status(400).json({ success: false, message: "At least one point is required" });
    }

    const route = await Route.create({
      user: req.user._id,
      rawPoints,
      processedPoints,
      encodedPolyline: typeof req.body.encodedPolyline === "string" ? req.body.encodedPolyline : undefined,
      startedAt: toOptionalDate(req.body.startedAt),
      endedAt: toOptionalDate(req.body.endedAt),
      distanceMeters: typeof req.body.distanceMeters === "number" ? req.body.distanceMeters : undefined,
      durationSeconds: typeof req.body.durationSeconds === "number" ? req.body.durationSeconds : undefined,
    });

    return res.status(201).json({ success: true, data: route });
  } catch (error) {
    console.error("saveRoute error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

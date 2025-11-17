import Territory from "../models/Territory.js";

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

const isSamePoint = (a, b, tolerance = 1e-6) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) {
    return false;
  }
  return Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;
};

const sanitizeRing = (ring) => {
  if (!Array.isArray(ring)) {
    return null;
  }

  const cleaned = [];
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

const normalizePolygonCoordinates = (raw) => {
  if (!Array.isArray(raw) || !raw.length) {
    return null;
  }

  const rings = raw
    .map((ring) => sanitizeRing(ring))
    .filter(Boolean);

  if (!rings.length) {
    return null;
  }

  return rings;
};

const normalizeGeometry = (body) => {
  if (body?.geometry && body.geometry.type !== "Polygon") {
    return null;
  }
  const source = body?.geometry?.coordinates ?? body?.coordinates;
  const normalizedCoordinates = normalizePolygonCoordinates(source);
  if (!normalizedCoordinates) {
    return null;
  }
  return {
    type: "Polygon",
    coordinates: normalizedCoordinates,
  };
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

export const claimTerritory = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Authentication is required" });
    }

    const geometry = normalizeGeometry(req.body);
    if (!geometry) {
      return res.status(400).json({ success: false, message: "Valid polygon geometry is required" });
    }

    const processedPoints = normalizePointSeries(req.body.processedPoints);
    const rawPoints = normalizePointSeries(req.body.rawPoints);

    const territoryPayload = {
      owner: req.user._id,
      name: req.body.name?.trim() || "Unnamed Territory",
      geometry,
      encodedPolyline: typeof req.body.encodedPolyline === "string" ? req.body.encodedPolyline : undefined,
      processedPoints,
      rawPoints,
      area: typeof req.body.area === "number" ? req.body.area : null,
      perimeter: typeof req.body.perimeter === "number" ? req.body.perimeter : null,
      claimedOn: toOptionalDate(req.body.claimedOn) ?? new Date(),
      deviceInfo: req.body.deviceInfo || undefined,
    };

    const territory = await Territory.create(territoryPayload);
    return res.status(201).json({ success: true, data: territory });
  } catch (err) {
    console.error("claimTerritory error", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getTerritories = async (req, res) => {
  try {
    // Accept optional 'scope' query parameter: 'user' or 'all'
    // Default to 'all' to show all territories in the city
    const scope = req.query.scope || 'all';
    
    let query = {};
    if (scope === 'user' && req.user?._id) {
      // Return only authenticated user's territories
      query = { owner: req.user._id };
    }
    // Otherwise return all territories (for map view showing all users)
    
    const territories = await Territory.find(query)
      .populate("owner", "username avatar avatarUrl displayName")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: territories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

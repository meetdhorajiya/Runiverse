import Territory from "../models/Territory.js";

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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

export const claimTerritory = async (req, res) => {
  try {
    const { coordinates, name, area, length } = req.body;

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
      console.error("Territory creation failed", dbError);
      return res.status(500).json({
        success: false,
        message: dbError?.message || "Failed to save territory",
      });
    }
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
      .populate("owner", "username avatarUrl avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: territories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

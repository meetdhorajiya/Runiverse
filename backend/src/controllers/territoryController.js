import Territory from "../models/Territory.js";

export const claimTerritory = async (req, res) => {
  try {
    const { coordinates, name, area, length } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({ success: false, message: "Polygon coordinates are required" });
    }

    const metrics = {
      area: typeof area === "number" ? area : null,
      length: typeof length === "number" ? length : null,
    };

    const territory = await Territory.create({
      owner: req.user?._id ?? null,
      location: { type: "Polygon", coordinates },
      name: name?.trim() || "Unnamed Territory",
      claimedOn: new Date(),
      metrics,
    });
    res.json({ success: true, data: territory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

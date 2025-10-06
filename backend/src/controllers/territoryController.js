import Territory from "../models/Territory.js";

export const claimTerritory = async (req, res) => {
  try {
    const { coordinates, name } = req.body;
    const territory = await Territory.create({
      owner: req.user._id,
      location: { type: "Polygon", coordinates },
      name,
      claimedOn: new Date(),
    });
    res.json({ success: true, data: territory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

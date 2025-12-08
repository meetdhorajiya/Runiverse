import mongoose, { Schema } from "mongoose";
const badgeSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    iconUrl: { type: String },
}, { timestamps: true });
const Badge = mongoose.model("Badge", badgeSchema);
export default Badge;

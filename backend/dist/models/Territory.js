import mongoose, { Schema } from "mongoose";
const territorySchema = new Schema({
    name: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    location: {
        type: {
            type: String,
            enum: ["Polygon"],
            default: "Polygon",
        },
        coordinates: {
            type: [[[Number]]],
            required: true,
        },
    },
    metrics: {
        area: { type: Number, default: null },
        length: { type: Number, default: null },
    },
    claimedOn: { type: Date },
}, { timestamps: true });
territorySchema.index({ location: "2dsphere" });
const Territory = mongoose.model("Territory", territorySchema);
export default Territory;

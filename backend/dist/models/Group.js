import mongoose, { Schema } from "mongoose";
const groupSchema = new Schema({
    name: { type: String, required: true },
    color: { type: String, default: "#000" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
const Group = mongoose.model("Group", groupSchema);
export default Group;

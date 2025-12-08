import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IGroup {
  name: string;
  color: string;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type GroupDocument = HydratedDocument<IGroup>;
export type GroupModel = Model<IGroup>;

const groupSchema = new Schema<IGroup, GroupModel>(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#000" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Group = mongoose.model<IGroup, GroupModel>("Group", groupSchema);
export default Group;

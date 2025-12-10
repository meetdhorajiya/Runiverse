import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

export interface IBadge {
  name: string;
  description?: string;
  iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BadgeDocument = HydratedDocument<IBadge>;
export type BadgeModel = Model<IBadge>;

const badgeSchema = new Schema<IBadge, BadgeModel>(
  {
    name: { type: String, required: true },
    description: { type: String },
    iconUrl: { type: String },
  },
  { timestamps: true }
);

const Badge = mongoose.model<IBadge, BadgeModel>("Badge", badgeSchema);
export default Badge;

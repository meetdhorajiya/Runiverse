import type { Request, Response } from "express";
import fs from "fs";
import { uploadImage, deleteImage } from "../services/cloudinaryService.js";
import User, { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
  file?: Express.Multer.File;
}

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log("📸 Uploading avatar for:", userId);
    console.log("📁 File received:", file.path);

    const result = await uploadImage(file.path);
    fs.unlinkSync(file.path);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.avatarPublicId) {
      await deleteImage(user.avatarPublicId);
    }

    user.avatarUrl = result.secureUrl;
    user.avatarPublicId = result.publicId;
    user.avatarProvider = "cloudinary";
    await user.save();

    console.log("✅ Avatar upload success:", user.avatarUrl);

    return res.json({ success: true, data: { avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
};

export const deleteAvatar = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.avatarPublicId) {
      return res.status(400).json({ success: false, message: "No avatar to delete" });
    }

    await deleteImage(user.avatarPublicId);
    user.avatarUrl = "";
    user.avatarPublicId = "";
    await user.save();

    return res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    console.error("Delete avatar error:", err);
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
};

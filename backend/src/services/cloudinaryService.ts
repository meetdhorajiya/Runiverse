import type { UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary.js";

export interface UploadImageResult {
  secureUrl: string;
  publicId: string;
}

export const uploadImage = async (filePath: string, folder = "avatars"): Promise<UploadImageResult> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face", radius: "max" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

export const deleteImage = async (publicId: string | undefined | null): Promise<void> => {
  if (!publicId) {
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

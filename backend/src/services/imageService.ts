import cloudinary from "../config/cloudinary.js";

export const getThumbnailUrl = (publicId: string, size = 100): string =>
  cloudinary.url(publicId, {
    width: size,
    height: size,
    crop: "thumb",
    gravity: "face",
  });

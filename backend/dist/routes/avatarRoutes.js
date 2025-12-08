import { Router } from "express";
import { uploadAvatar, deleteAvatar } from "../controllers/avatarController.js";
import { validateImageFile } from "../middlewares/fileValidation.js";
import { authMiddleware } from "../middlewares/auth.js";
import { upload } from "../middlewares/uploadMiddleware.js";
const router = Router();
router.post("/upload", authMiddleware, upload.single("avatar"), validateImageFile, uploadAvatar);
router.delete("/delete", authMiddleware, deleteAvatar);
export default router;

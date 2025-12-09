import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import request from "supertest";

import app from "../../dist/app.js";
import User from "../../dist/models/User.js";
import * as cloudinaryService from "../../dist/services/cloudinaryService.js";
import "../../dist/models/Badge.js";
import "../../dist/models/Territory.js";

const TEST_SECRET = "phase4-secret";

const createTempImage = (): string => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "avatar-test-"));
  const filePath = path.join(tempDir, `${crypto.randomUUID()}.png`);
  fs.writeFileSync(filePath, crypto.randomBytes(64));
  return filePath;
};

describe("Avatar media endpoints", () => {
  const uploadSpy = jest.spyOn(cloudinaryService, "uploadImage");
  const deleteSpy = jest.spyOn(cloudinaryService, "deleteImage");

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRATION = "1h";
    uploadSpy.mockResolvedValue({ secureUrl: "https://cdn.example.com/avatar.png", publicId: "avatar-123" });
    deleteSpy.mockResolvedValue();
  });

  afterAll(() => {
    uploadSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const register = async () => {
    const payload = {
      username: `avatar-${Math.random().toString(16).slice(2, 8)}`,
      email: `avatar-${Math.random().toString(16).slice(2, 8)}@example.com`,
      password: "Passw0rd!",
    };

    const response = await request(app).post("/api/auth/register").send(payload);
    expect(response.status).toBe(201);
    return { token: response.body.token as string, userId: response.body.user.id as string };
  };

  it("rejects avatar upload without a file", async () => {
    const { token } = await register();

    const response = await request(app)
      .post("/api/avatar/upload")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: "No file uploaded" });
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("uploads avatar and updates the user profile", async () => {
    const { token, userId } = await register();
    const tempFile = createTempImage();

    const response = await request(app)
      .post("/api/avatar/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", tempFile);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(uploadSpy).toHaveBeenCalledTimes(1);

    const updatedUser = await User.findById(userId).lean();
    expect(updatedUser?.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(updatedUser?.avatarPublicId).toBe("avatar-123");
  });

  it("deletes avatar when requested", async () => {
    const { token, userId } = await register();
    const tempFile = createTempImage();

    await request(app)
      .post("/api/avatar/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", tempFile)
      .expect(200);

    const deleteResponse = await request(app)
      .delete("/api/avatar/delete")
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalledWith("avatar-123");

    const updatedUser = await User.findById(userId).lean();
    expect(updatedUser?.avatarUrl).toBe("");
    expect(updatedUser?.avatarPublicId).toBe("");
  });
});

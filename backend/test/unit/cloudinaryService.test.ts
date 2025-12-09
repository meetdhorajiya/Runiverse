import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type UploadResult = { secure_url: string; public_id: string };
type DestroyResult = { result: string };
type UploadFn = (path: string, options?: Record<string, unknown>) => Promise<UploadResult>;
type DestroyFn = (publicId: string) => Promise<DestroyResult>;
const uploadMock = jest.fn<UploadFn>();
const destroyMock = jest.fn<DestroyFn>();

jest.mock("../../dist/config/cloudinary.js", () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: uploadMock,
      destroy: destroyMock
    }
  }
}));

import { uploadImage, deleteImage } from "../../dist/services/cloudinaryService.js";

describe("cloudinaryService", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    uploadMock.mockResolvedValue({
      secure_url: "https://cdn.example.com/image.jpg",
      public_id: "public-id-123"
    });
    destroyMock.mockResolvedValue({ result: "ok" });
  });

  it("uploads an image and returns Cloudinary identifiers", async () => {
    const result = await uploadImage("/tmp/avatar.png", "profiles");

    expect(uploadMock).toHaveBeenCalledWith("/tmp/avatar.png", expect.objectContaining({
      folder: "profiles"
    }));
    expect(result).toEqual({
      secureUrl: "https://cdn.example.com/image.jpg",
      publicId: "public-id-123"
    });
  });

  it("skips deletion when no public id is provided", async () => {
    await deleteImage(undefined);

    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("deletes an image when a public id exists", async () => {
    await deleteImage("public-id-789");

    expect(destroyMock).toHaveBeenCalledWith("public-id-789");
  });
});

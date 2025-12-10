import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import express from "express";
import request from "supertest";

import { validateImageFile } from "../../dist/middlewares/fileValidation.js";
import { errorHandler, notFound } from "../../dist/middlewares/errorMiddleware.js";

const buildMockResponse = () => {
  const raw = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { raw, res: raw as unknown as Pick<express.Response, "status" | "json"> };
};

describe("middleware utilities", () => {
  describe("validateImageFile", () => {
    let next: jest.Mock;

    beforeEach(() => {
      next = jest.fn();
    });

    it("returns 400 when no file is present", () => {
      const req = { file: undefined } as Parameters<typeof validateImageFile>[0];
      const { raw, res } = buildMockResponse();

      validateImageFile(req, res as express.Response, next);

      expect(raw.status).toHaveBeenCalledWith(400);
      expect(raw.json).toHaveBeenCalledWith({ message: "No file uploaded" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid mimetype", () => {
      const req = {
        file: {
          mimetype: "application/pdf",
          size: 10,
        },
      } as unknown as Parameters<typeof validateImageFile>[0];
      const { raw, res } = buildMockResponse();

      validateImageFile(req, res as express.Response, next);

      expect(raw.status).toHaveBeenCalledWith(400);
      expect(raw.json).toHaveBeenCalledWith({ message: "Invalid file type" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 for oversized files", () => {
      const req = {
        file: {
          mimetype: "image/png",
          size: 6 * 1024 * 1024,
        },
      } as unknown as Parameters<typeof validateImageFile>[0];
      const { raw, res } = buildMockResponse();

      validateImageFile(req, res as express.Response, next);

      expect(raw.status).toHaveBeenCalledWith(400);
      expect(raw.json).toHaveBeenCalledWith({ message: "File too large (max 5MB)" });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next for valid image files", () => {
      const req = {
        file: {
          mimetype: "image/jpeg",
          size: 512 * 1024,
        },
      } as unknown as Parameters<typeof validateImageFile>[0];
      const { raw, res } = buildMockResponse();

      validateImageFile(req, res as express.Response, next);

      expect(raw.status).not.toHaveBeenCalled();
      expect(raw.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("error middleware", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("formats thrown errors with stack trace outside production", async () => {
      process.env.NODE_ENV = "test";
      const app = express();
      app.get("/boom", () => {
        throw new Error("Boom");
      });
      app.use(errorHandler);

      const response = await request(app).get("/boom");
      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Boom");
      expect(response.body.stack).toContain("Error: Boom");
    });

    it("suppresses stack trace in production", async () => {
      process.env.NODE_ENV = "production";
      const app = express();
      app.use(notFound);
      app.use(errorHandler);

      const response = await request(app).get("/missing");
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Not Found - /missing");
      expect(response.body.stack).toBeNull();
    });
  });
});

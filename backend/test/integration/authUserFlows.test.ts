import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../dist/app.js";
import User from "../../dist/models/User.js";
import "../../dist/models/Badge.js";

const TEST_SECRET = "integration-secret";

const registerPayload = (overrides: Record<string, unknown> = {}) => ({
  username: "runner" + Math.random().toString(16).slice(2, 6),
  email: `runner${Math.random().toString(16).slice(2, 6)}@example.com`,
  password: "Passw0rd!",
  lastName: "Doe",
  mobileNumber: "1234567890",
  ...overrides,
});

describe("Auth & User flows", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRATION = "1h";
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user and returns a token", async () => {
      const payload = registerPayload();

      const response = await request(app).post("/api/auth/register").send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        message: "Registration successful",
      });
      expect(typeof response.body.token).toBe("string");
      expect(response.body.user).toMatchObject({
        username: payload.username,
        email: payload.email.toLowerCase(),
      });
      expect(response.body.user).not.toHaveProperty("password");

      const createdUser = await User.findOne({ email: payload.email.toLowerCase() }).lean();
      expect(createdUser).not.toBeNull();
      expect(await bcrypt.compare(payload.password as string, createdUser!.password)).toBe(true);
    });

    it("rejects a registration missing required fields", async () => {
      const response = await request(app).post("/api/auth/register").send({ email: "missing@example.com" });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ success: false });
    });

    it("prevents duplicate registrations", async () => {
      const payload = registerPayload({ username: "duplicate", email: "duplicate@example.com" });

      await request(app).post("/api/auth/register").send(payload).expect(201);
      const duplicateResponse = await request(app).post("/api/auth/register").send(payload);

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body).toMatchObject({ success: false, message: "User already exists" });
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in an existing user with valid credentials", async () => {
      const payload = registerPayload({ username: "loginuser", email: "login@example.com" });
      await request(app).post("/api/auth/register").send(payload).expect(201);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: payload.email, password: payload.password });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, message: "Login successful" });
      expect(response.body.user).toMatchObject({ email: payload.email.toLowerCase() });
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("rejects invalid credentials", async () => {
      const payload = registerPayload({ username: "wrongpass", email: "wrongpass@example.com" });
      await request(app).post("/api/auth/register").send(payload).expect(201);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: payload.email, password: "incorrect" });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ success: false, message: "Invalid credentials" });
    });
  });

  describe("Authenticated user routes", () => {
    const authenticate = async () => {
      const payload = registerPayload({ username: "profileuser", email: "profile@example.com" });
      const registerResponse = await request(app).post("/api/auth/register").send(payload).expect(201);
      return { token: registerResponse.body.token, payload };
    };

    it("requires a bearer token", async () => {
      const response = await request(app).get("/api/users/me");
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ msg: "No token, authorization denied" });
    });

    it("returns the authenticated user's profile", async () => {
      const { token, payload } = await authenticate();

      const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: payload.email.toLowerCase(),
        username: payload.username,
      });
      expect(response.body).not.toHaveProperty("password");
    });

    it("updates the user profile", async () => {
      const { token } = await authenticate();

      const response = await request(app)
        .put("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "Trail Runner", bio: "Loves elevation" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ displayName: "Trail Runner", bio: "Loves elevation" });
    });

    it("syncs user stats", async () => {
      const { token } = await authenticate();

      const response = await request(app)
        .put("/api/users/me/sync-stats")
        .set("Authorization", `Bearer ${token}`)
        .send({ steps: 1200, distance: 3.4 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ msg: "Stats synced successfully" });
      expect(response.body.user).toMatchObject({ steps: 1200, distance: 3.4 });
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../dist/app.js";
import Territory from "../../dist/models/Territory.js";
import User from "../../dist/models/User.js";
import "../../dist/models/Badge.js";

const TEST_SECRET = "phase3-secret";
const basePolygon = [
  [0, 0],
  [0, 0.001],
  [0.001, 0.001],
  [0.001, 0],
];

const registerUser = async (overrides: Record<string, unknown> = {}) => {
  const payload = {
    username: `geo-${Math.random().toString(16).slice(2, 8)}`,
    email: `geo-${Math.random().toString(16).slice(2, 8)}@example.com`,
    password: "Passw0rd!",
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(payload);
  expect(response.status).toBe(201);
  return { token: response.body.token as string, userId: response.body.user.id as string, payload };
};

describe("Territories", () => {
  let originalFeatureFlag: string | undefined;

  beforeEach(() => {
    originalFeatureFlag = process.env.FEATURE_USE_NEW_GEOMETRY;
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRATION = "1h";
  });

  afterEach(() => {
    if (typeof originalFeatureFlag === "undefined") {
      delete process.env.FEATURE_USE_NEW_GEOMETRY;
    } else {
      process.env.FEATURE_USE_NEW_GEOMETRY = originalFeatureFlag;
    }
  });

  it("claims a territory using modern geometry flow", async () => {
    const { token, userId } = await registerUser();

    const response = await request(app)
      .post("/api/territories/claim")
      .set("Authorization", `Bearer ${token}`)
      .send({
        polygonRings: [basePolygon],
        name: "Test Territory",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(response.body.data.owner).toEqual(userId);
    expect(response.body.data.area).toBeGreaterThan(0);
    expect(response.body.data.processedPoints[0][0]).toEqual(basePolygon[0]);

    const stored = await Territory.findOne({ owner: userId }).lean();
    expect(stored).not.toBeNull();
    expect(stored?.processedPoints[0]).toHaveLength(basePolygon.length + 1);
    expect(stored?.area).toBeGreaterThan(0);
    expect(stored?.perimeter).toBeGreaterThan(0);
  });

  it("supports legacy geometry flow when feature flag is disabled", async () => {
    process.env.FEATURE_USE_NEW_GEOMETRY = "false";
    const { token, userId } = await registerUser();

    const response = await request(app)
      .post("/api/territories/claim")
      .set("Authorization", `Bearer ${token}`)
      .send({
        coordinates: [basePolygon],
        name: "Legacy Territory",
        perimeter: 123,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(response.body.data.owner).toEqual(userId);
    expect(response.body.data.perimeter).toBeGreaterThan(0);
  });

  it("filters territories by owner when scope=user", async () => {
    const { token: ownerToken, userId } = await registerUser({ username: "owner-1" });
    await registerUser({ username: "other-1" });

    await request(app)
      .post("/api/territories/claim")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ polygonRings: [basePolygon], name: "Owner Territory" })
      .expect(200);

    const otherUser = await registerUser({ username: "other-2" });
    await request(app)
      .post("/api/territories/claim")
      .set("Authorization", `Bearer ${otherUser.token}`)
      .send({ polygonRings: [basePolygon], name: "Other Territory" })
      .expect(200);

    const scopedResponse = await request(app)
      .get("/api/territories")
      .query({ scope: "user" })
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(scopedResponse.status).toBe(200);
    expect(scopedResponse.body).toMatchObject({ success: true });
    expect(scopedResponse.body.data).toHaveLength(1);
    expect(scopedResponse.body.data[0].owner._id ?? scopedResponse.body.data[0].owner).toEqual(userId);

    const publicResponse = await request(app).get("/api/territories");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

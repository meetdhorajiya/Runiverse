import { beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import app from "../../dist/app.js";
import Challenge from "../../dist/models/Challenge.js";
import Territory from "../../dist/models/Territory.js";
import User from "../../dist/models/User.js";
import "../../dist/models/Badge.js";

const TEST_SECRET = "phase2-secret";

const uniqueValue = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const registerAndGetToken = async (overrides: Record<string, unknown> = {}) => {
  const payload = {
    username: uniqueValue("runner"),
    email: `${uniqueValue("runner")}@example.com`,
    password: "Passw0rd!",
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(payload);
  expect(response.status).toBe(201);

  return { token: response.body.token as string, userId: response.body.user.id as string, payload };
};

describe("Challenges and Leaderboard", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRATION = "1h";
  });

  describe("Challenge lifecycle", () => {
    it("creates and lists personal challenges", async () => {
      const { token } = await registerAndGetToken();

      const createResponse = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Hit 10k steps",
          difficulty: "medium",
          type: "steps",
          target: 10000,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toMatchObject({
        title: "Hit 10k steps",
        goal: 10000,
        type: "steps",
        difficulty: "medium",
      });

      const listResponse = await request(app)
        .get("/api/challenges")
        .set("Authorization", `Bearer ${token}`);

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0]).toMatchObject({ title: "Hit 10k steps", goal: 10000 });
    });

    it("marks a challenge complete and updates progress", async () => {
      const { token, userId } = await registerAndGetToken();

      const createResponse = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Morning run",
          difficulty: "easy",
          type: "distance",
          target: 5,
        });

      const challengeId = createResponse.body._id as string;

      const progressResponse = await request(app)
        .put("/api/challenges/public/progress")
        .set("Authorization", `Bearer ${token}`)
        .send({ challengeId, distance: 5 });

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body).toMatchObject({ success: true });
      expect(progressResponse.body.data).toMatchObject({
        currentProgress: 5,
        completed: true,
      });

      const completeResponse = await request(app)
        .put(`/api/challenges/${challengeId}/complete`)
        .set("Authorization", `Bearer ${token}`);

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body).toMatchObject({ msg: "Task marked as completed" });

      const challenge = await Challenge.findById(challengeId).lean();
      expect(challenge?.completed).toBe(true);
      expect(challenge?.progress[0].completed).toBe(true);
      expect(challenge?.progress[0].user?.toString()).toBe(userId);
    });

    it("deletes a challenge and removes it from the collection", async () => {
      const { token } = await registerAndGetToken();

      const createResponse = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Evening walk",
          difficulty: "easy",
          type: "steps",
          target: 6000,
        });

      const challengeId = createResponse.body._id as string;

      const deleteResponse = await request(app)
        .delete(`/api/challenges/${challengeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toMatchObject({ msg: "Task deleted successfully" });

      const challengeCount = await Challenge.countDocuments({ _id: new Types.ObjectId(challengeId) });
      expect(challengeCount).toBe(0);
    });
  });

  describe("Leaderboard endpoints", () => {
    it("returns a global leaderboard sorted by distance", async () => {
      const { token, userId } = await registerAndGetToken();

      await User.findByIdAndUpdate(userId, {
        distance: 15,
        steps: 1200,
        lifetimeDistance: 30,
        lifetimeSteps: 9000,
      });

      const hashed = await bcrypt.hash("Passw0rd!", 10);

      await User.create([
        {
          username: "sprinter",
          email: "sprinter@example.com",
          password: hashed,
          distance: 25,
          steps: 8000,
          lifetimeDistance: 50,
          lifetimeSteps: 20000,
        },
        {
          username: "walker",
          email: "walker@example.com",
          password: hashed,
          distance: 5,
          steps: 4000,
          lifetimeDistance: 12,
          lifetimeSteps: 12000,
        },
      ]);

      const response = await request(app)
        .get("/api/leaderboard")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      const [first, second] = response.body.data;
      expect(first.distance).toBeGreaterThanOrEqual(second.distance);
      expect(response.body.data[0].username).toBe("sprinter");
    });

    it("aggregates city leaderboard with territory stats", async () => {
      const { token, userId } = await registerAndGetToken({ username: "citizen", email: "citizen@example.com" });

      await User.findByIdAndUpdate(userId, {
        city: "Metropolis",
        distance: 12,
        steps: 6000,
        lifetimeDistance: 20,
        lifetimeSteps: 15000,
      });

      const hashed = await bcrypt.hash("Passw0rd!", 10);
      const rival = await User.create({
        username: "city-rival",
        email: "cityrival@example.com",
        password: hashed,
        city: "Metropolis",
        distance: 18,
        steps: 9000,
        lifetimeDistance: 28,
        lifetimeSteps: 20000,
      });

      await Territory.create([
        {
          name: "Central Park",
          owner: rival._id,
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]],
          },
          processedPoints: [[[0, 0], [0, 1], [1, 1], [0, 0]]],
          rawPoints: [],
          area: 42,
          perimeter: 10,
        },
        {
          name: "Downtown Loop",
          owner: rival._id,
          geometry: {
            type: "Polygon",
            coordinates: [[[1, 1], [1, 2], [2, 2], [1, 1]]],
          },
          processedPoints: [[[1, 1], [1, 2], [2, 2], [1, 1]]],
          rawPoints: [],
          area: 58,
          perimeter: 12,
        },
      ]);

      const response = await request(app)
        .get("/api/leaderboard/city")
        .query({ city: "Metropolis" })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true });
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const rivalEntry = response.body.data.find((entry: { username: string }) => entry.username === "city-rival");
      expect(rivalEntry).toMatchObject({
        totalArea: 100,
        territoryCount: 2,
        rank: 1,
      });
    });
  });
});

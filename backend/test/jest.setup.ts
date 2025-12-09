import { afterAll, afterEach, beforeAll } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  process.env.MONGO_URI = mongoUri;

  await mongoose.connect(mongoUri, {
    dbName: "runiverse-test"
  });
});

afterEach(async () => {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const collections = await db.collections();

  await Promise.all(
    collections.map(async (collection) => {
      await collection.deleteMany({});
    })
  );
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

import { MongoClient } from "mongodb";

// One shared connection (survives hot reloads in dev and warm serverless invocations)
export async function getDb() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(process.env.MONGO_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).connect();
  }
  const db = (await global._mongoClient).db(); // database name comes from the URI (/comptracker)
  if (!global._mongoIndexes) {
    global._mongoIndexes = Promise.all([
      db.collection("users").createIndex({ username: 1 }, { unique: true }),
      db.collection("inspections").createIndex({ lab: 1, pc: 1, date: 1 }),
      db.collection("login_attempts").createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((e) => { global._mongoIndexes = null; throw e; });
  }
  await global._mongoIndexes;
  return db;
}

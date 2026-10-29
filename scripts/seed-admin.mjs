// Creates the first administrator. Run once:  npm run seed-admin
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const { MONGO_URI, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
if (!MONGO_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD) { console.error("Set MONGO_URI, ADMIN_USERNAME and ADMIN_PASSWORD in .env.local"); process.exit(1); }
if (ADMIN_PASSWORD.length < 10) { console.error("ADMIN_PASSWORD must be at least 10 characters"); process.exit(1); }

const client = await new MongoClient(MONGO_URI).connect();
const users = client.db().collection("users");
await users.createIndex({ username: 1 }, { unique: true });
const username = ADMIN_USERNAME.trim().toLowerCase();
if (await users.findOne({ username })) console.log(`User "${username}" already exists — nothing changed.`);
else {
  await users.insertOne({ username, name: ADMIN_NAME || "Administrator", role: "admin", active: true, tokenVersion: 0,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), createdAt: new Date().toISOString() });
  console.log(`Created admin "${username}". Sign in, then remove ADMIN_PASSWORD from .env.local.`);
}
await client.close();

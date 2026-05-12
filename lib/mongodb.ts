import { Db, MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = (global as Record<string, unknown>).mongodb as
  | { client: MongoClient; db: Db }
  | undefined;

export async function getDb(): Promise<Db> {
  if (cached) return cached.db;
  const client = await MongoClient.connect(MONGODB_URI!);
  const db = client.db();
  cached = { client, db };
  return db;
}

export async function getClient(): Promise<MongoClient> {
  if (cached) return cached.client;
  await getDb();
  return cached!.client;
}
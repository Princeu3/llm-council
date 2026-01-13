/**
 * MongoDB connection singleton for Netlify Functions.
 * Reuses connection across function invocations.
 */

import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db('llm_council');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getConversationsCollection() {
  const { db } = await connectToDatabase();
  return db.collection('conversations');
}

export async function getJobsCollection() {
  const { db } = await connectToDatabase();
  return db.collection('jobs');
}

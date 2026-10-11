import { MongoClient } from 'mongodb';

const buckets = new Map();
let mongo;
let collection;

export async function initStorage() {
  if (!process.env.MONGODB_URI) return;
  try {
    mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 1200 });
    await mongo.connect();
    const db = mongo.db(process.env.MONGODB_DB || 'fleetdash');
    collection = db.collection('telemetry_buckets');
    await collection.createIndex({ vehicleId: 1, bucketStart: 1 }, { unique: true });
    console.log('MongoDB connected — bucket pattern enabled');
  } catch (e) {
    console.log('MongoDB unavailable — using in-memory bucket adapter');
    try { await mongo?.close(); } catch {}
    collection = undefined;
  }
}

function bucketKey(vehicleId, timestamp) {
  const d = new Date(timestamp);
  d.setMinutes(0, 0, 0);
  return `${vehicleId}:${d.toISOString()}`;
}

export async function saveTelemetry(t) {
  const key = bucketKey(t.vehicleId, t.timestamp);
  const bucketStart = key.split(':').slice(1).join(':');
  if (collection) {
    await collection.updateOne(
      { vehicleId: t.vehicleId, bucketStart },
      { $setOnInsert: { vehicleId: t.vehicleId, bucketStart, createdAt: new Date() }, $push: { points: t } },
      { upsert: true }
    );
    return;
  }
  const bucket = buckets.get(key) || { vehicleId: t.vehicleId, bucketStart, points: [] };
  bucket.points.push(t);
  if (bucket.points.length > 5000) bucket.points.shift();
  buckets.set(key, bucket);
}

export function getBucketStats() {
  let points = 0;
  for (const b of buckets.values()) points += b.points.length;
  return { buckets: buckets.size, bufferedPoints: points, mode: collection ? 'mongodb' : 'memory' };
}

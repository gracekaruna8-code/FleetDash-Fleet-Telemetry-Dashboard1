import { createClient } from 'redis';
let publisher;
let subscriber;

export async function initRedis(onMessage) {
  if (!process.env.REDIS_URL) return false;
  try {
    publisher = createClient({ url: process.env.REDIS_URL });
    subscriber = publisher.duplicate();
    publisher.on('error', () => {}); subscriber.on('error', () => {});
    await publisher.connect(); await subscriber.connect();
    await subscriber.subscribe('fleet:telemetry', (message) => onMessage(JSON.parse(message)));
    console.log('Redis Pub/Sub connected');
    return true;
  } catch {
    try { await publisher?.disconnect(); } catch {}
    try { await subscriber?.disconnect(); } catch {}
    publisher = undefined; subscriber = undefined;
    console.log('Redis unavailable — local Socket.io broadcast mode');
    return false;
  }
}

export async function publishTelemetry(payload) {
  if (publisher) await publisher.publish('fleet:telemetry', JSON.stringify(payload));
}

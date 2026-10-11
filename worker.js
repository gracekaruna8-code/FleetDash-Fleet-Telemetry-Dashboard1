import { parentPort } from 'node:worker_threads';

function normalize(event) {
  const latitude = Number(event.lat);
  const longitude = Number(event.lng);
  const speed = Math.max(0, Number(event.speed) || 0);
  const fuel = Math.min(100, Math.max(0, Number(event.fuel) ?? 0));
  if (!event.vehicleId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    vehicleId: String(event.vehicleId), lat: latitude, lng: longitude,
    speed, fuel, timestamp: event.timestamp || new Date().toISOString(),
    status: speed > 3 ? 'moving' : 'idle'
  };
}

parentPort.on('message', (event) => {
  const telemetry = normalize(event);
  if (!telemetry) parentPort.postMessage({ type: 'invalid' });
  else parentPort.postMessage({ type: 'telemetry', telemetry });
});

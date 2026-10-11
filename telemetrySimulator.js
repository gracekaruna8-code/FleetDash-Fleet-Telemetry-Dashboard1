// Sends a mix of normal and deliberately alert-triggering demo readings.
// Usage: node src/telemetrySimulator.js [event-count]
const base = [
  ['FD-1001',28.61,77.23], ['FD-1002',27.32,77.82],
  ['FD-1003',28.64,77.20], ['FD-1004',27.48,77.69],
  ['FD-1005',28.67,77.28]
];
const count = Math.max(1, Number(process.argv[2] || 100));
const requests = [];
for (let i = 0; i < count; i++) {
  const [id, lat, lng] = base[i % base.length];
  // Every fifth event intentionally breaches a threshold so alert behavior is easy to demo.
  const trigger = i % 5 === 0;
  const event = {
    vehicleId: id,
    lat: lat + (Math.random() - 0.5) * 0.02,
    lng: lng + (Math.random() - 0.5) * 0.02,
    speed: trigger ? 105 : 25 + Math.random() * 60,
    fuel: trigger && i % 10 === 0 ? 8 : 20 + Math.random() * 75,
    timestamp: new Date().toISOString()
  };
  requests.push(fetch('http://localhost:5000/api/telemetry', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event)
  }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }));
}
try {
  await Promise.all(requests);
  console.log(`Submitted ${count} telemetry events. Check FleetDash → Alerts in a few seconds.`);
} catch (error) {
  console.error('Could not submit telemetry. Is the backend running at http://localhost:5000?', error.message);
  process.exitCode = 1;
}

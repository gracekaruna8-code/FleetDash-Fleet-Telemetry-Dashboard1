import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';
import { Worker } from 'node:worker_threads';
import { initStorage, saveTelemetry, getBucketStats } from './storage.js';
import { initRedis, publishTelemetry } from './redis.js';
import { checkAlerts, geofences } from './geofence.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(cors()); app.use(express.json());

const vehicles = new Map([
 ['FD-1001',{id:'FD-1001',name:'Fleet Truck 1001',driver:'Arjun',lat:28.61,lng:77.23,speed:54,fuel:72,status:'moving',location:'Delhi'}],
 ['FD-1002',{id:'FD-1002',name:'Fleet Truck 1002',driver:'Priya',lat:27.32,lng:77.82,speed:42,fuel:61,status:'moving',location:'Agra Corridor'}],
 ['FD-1003',{id:'FD-1003',name:'Fleet Truck 1003',driver:'Rahul',lat:28.64,lng:77.20,speed:0,fuel:44,status:'idle',location:'Delhi Hub'}],
 ['FD-1004',{id:'FD-1004',name:'Fleet Truck 1004',driver:'Sneha',lat:27.48,lng:77.69,speed:67,fuel:31,status:'moving',location:'Agra'}],
 ['FD-1005',{id:'FD-1005',name:'Fleet Truck 1005',driver:'Vikram',lat:28.67,lng:77.28,speed:92,fuel:18,status:'moving',location:'Delhi NCR'}]
]);
const alerts = [];
const lastAlertAt = new Map();
let processed = 0, invalid = 0;

function recordAlerts(telemetry) {
  for (const rule of checkAlerts(telemetry)) {
    // Avoid flooding the alert center with the same rule on every telemetry tick.
    const key = `${telemetry.vehicleId}:${rule.type}:${rule.geofenceId || ''}`;
    const now = Date.now();
    if (now - (lastAlertAt.get(key) || 0) < 15000) continue;
    lastAlertAt.set(key, now);
    const item = { id: `A-${now}-${Math.random().toString(36).slice(2, 7)}`, vehicle: telemetry.vehicleId, time: new Date(now).toISOString(), ...rule };
    alerts.unshift(item);
    if (alerts.length > 30) alerts.length = 30;
    io.emit('fleet:alert', item);
  }
}

// Seed the demo alert center from the initial sample fleet so the dashboard
// demonstrates its alert workflow immediately on startup.
for (const vehicle of vehicles.values()) recordAlerts({
  vehicleId: vehicle.id, lat: vehicle.lat, lng: vehicle.lng,
  speed: vehicle.speed, fuel: vehicle.fuel, timestamp: new Date().toISOString()
});
const worker = new Worker(new URL('./worker.js', import.meta.url));
const pending = [];
worker.on('message', async (msg) => {
  if (msg.type === 'invalid') { invalid++; return; }
  const t = msg.telemetry; processed++;
  const v = vehicles.get(t.vehicleId) || { id:t.vehicleId, name:`Fleet Truck ${t.vehicleId}`, driver:'Demo Driver' };
  Object.assign(v, { lat:t.lat,lng:t.lng,speed:t.speed,fuel:t.fuel,status:t.status,location:`${t.lat.toFixed(3)}, ${t.lng.toFixed(3)}` });
  vehicles.set(t.vehicleId,v);
  await saveTelemetry(t);
  recordAlerts(t);
  const payload = { ...t, name:v.name, driver:v.driver };
  await publishTelemetry(payload);
  io.emit('fleet:telemetry', payload);
});

await initStorage();
const redisEnabled = await initRedis((payload) => io.emit('fleet:telemetry', payload));

app.get('/api/health', (req,res)=>res.json({ok:true, service:'FleetDash backend', processed, invalid, redis:redisEnabled, storage:getBucketStats()}));
app.get('/api/vehicles', (req,res)=>res.json([...vehicles.values()]));
app.get('/api/alerts', (req,res)=>res.json(alerts));
app.get('/api/geofences', (req,res)=>res.json(geofences.map(g=>({id:g.id,name:g.name,severity:g.severity,coordinates:g.coordinates}))));
app.post('/api/telemetry', (req,res)=>{ worker.postMessage(req.body); res.status(202).json({accepted:true}); });
app.get('/api/stats',(req,res)=>res.json({totalVehicles:vehicles.size,activeVehicles:[...vehicles.values()].filter(v=>v.status==='moving').length,activeAlerts:alerts.length,processed,invalid,storage:getBucketStats()}));

io.on('connection',(socket)=>{ socket.emit('fleet:snapshot',{vehicles:[...vehicles.values()], geofences, alerts}); });

const port = Number(process.env.PORT || 5000);
server.listen(port,()=>console.log(`FleetDash backend running on http://localhost:${port}`));

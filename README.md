# FleetDash — High-Throughput Event-Driven Fleet Telemetry Dashboard

Review-ready integrated demo based on the FleetDash UI and requirements discussed in the project plan.

## Included
- React + Vite frontend
- Canvas-based high-frequency telemetry viewport using requestAnimationFrame
- Node.js + Express backend
- worker_threads telemetry processor
- Socket.io live transport
- MongoDB bucket-pattern persistence adapter (optional; app runs in demo mode without MongoDB)
- Redis Pub/Sub adapter (optional; app runs in local mode without Redis)
- Turf.js geofence breach detection
- Live alerts and vehicle status
- Multiple alert rules evaluated per telemetry event (geofence, speed above 90 km/h, fuel below 15%)
- Alert cooldown to prevent repeated identical alerts flooding the list
- k6 load-test script
- Jest/Supertest API test
- Review notes and architecture documentation

## Important
This package is a clean integrated review build reconstructed from the FleetDash code/features available in the conversation. It is not a byte-for-byte export of your original VS Code folder. The original UI snippets included API-driven vehicle/alert pages and a Leaflet dashboard; this package preserves those functional ideas while integrating the missing high-throughput pieces for the review demo.

## Run
### Backend
```bash
cd backend
npm install
npm run dev
```
Backend: http://localhost:5000

### Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

### Optional MongoDB
Set `MONGODB_URI` in backend/.env. Without it, telemetry is kept in the in-memory bucket adapter.

### Optional Redis
Set `REDIS_URL` in backend/.env. Without it, Socket.io still works directly in local demo mode.

## Review demo flow
1. Open the dashboard.
2. Click Live Fleet.
3. Watch vehicle points move on Canvas.
4. Open Alerts and show geofence/speed alerts.
5. The alert center is seeded from the sample fleet on startup. To generate additional test telemetry, open a terminal in `backend` and run `node src/telemetrySimulator.js 100`. The simulator intentionally sends some over-speed / low-fuel events so the alert workflow is easy to demonstrate.
6. Run k6 if installed: `k6 run tests/load-test.js`.

## Architecture
Telemetry simulator -> Express -> worker thread -> geofence rules -> bucket persistence / Redis PubSub -> Socket.io -> React Canvas -> Alerts

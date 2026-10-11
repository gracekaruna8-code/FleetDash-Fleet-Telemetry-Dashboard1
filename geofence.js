import { point, polygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

export const geofences = [
  { id: 'gf-1', name: 'Delhi Restricted Zone', severity: 'critical', coordinates: [[77.18,28.58],[77.30,28.58],[77.30,28.68],[77.18,28.68],[77.18,28.58]] },
  { id: 'gf-2', name: 'Agra Operations Zone', severity: 'warning', coordinates: [[77.70,27.20],[77.92,27.20],[77.92,27.42],[77.70,27.42],[77.70,27.20]] }
];

// Return every rule match for a telemetry event. Previously the first matching
// geofence returned early, which prevented speed/fuel rules from being checked.
export function checkAlerts(t) {
  const matches = [];
  const p = point([t.lng, t.lat]);
  for (const g of geofences) {
    if (booleanPointInPolygon(p, polygon([g.coordinates]))) {
      matches.push({ type: 'geofence', severity: g.severity, geofenceId: g.id, message: `${t.vehicleId} is inside ${g.name}` });
    }
  }
  if (Number(t.speed) > 90) matches.push({ type: 'speed', severity: 'warning', message: `${t.vehicleId} exceeded 90 km/h (${Math.round(t.speed)} km/h)` });
  if (Number(t.fuel) < 15) matches.push({ type: 'fuel', severity: 'warning', message: `${t.vehicleId} fuel is below 15% (${Math.round(t.fuel)}%)` });
  return matches;
}

// Backwards-compatible helper for code that expects a single match.
export function checkGeofence(t) { return checkAlerts(t)[0] || null; }

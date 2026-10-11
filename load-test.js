import http from 'k6/http';
import { check } from 'k6';
export const options={vus:20,duration:'10s',thresholds:{http_req_failed:['rate<0.01']}};
export default function(){const body=JSON.stringify({vehicleId:`LOAD-${__VU}`,lat:28.61+(Math.random()-.5)*.2,lng:77.23+(Math.random()-.5)*.2,speed:20+Math.random()*90,fuel:20+Math.random()*70});const r=http.post('http://localhost:5000/api/telemetry',body,{headers:{'Content-Type':'application/json'}});check(r,{'accepted':x=>x.status===202});}

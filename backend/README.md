# DrySense backend

Node HTTP API for the DrySense prototype. Drying sessions/auth stay in-memory, while
DHT11 sensor data pushed by the ESP32 is persisted to MongoDB Atlas via `MONGO_URL`
(loaded from `backend/.env`, see `.env.example`).

## Run

```powershell
cd backend
npm install
npm start        # loads .env, connects MongoDB, listens on :4000
```

Set `PORT` to use another port.

## Endpoints

### Core (in-memory)

- `GET /api/health`
- `GET /api/options`
- `POST /api/analyze`
- `POST /api/auth/signup` · `POST /api/auth/login`
- `GET /api/sessions` · `POST /api/sessions`
- `GET /api/sessions/:id` · `PATCH /api/sessions/:id`
- `POST /api/sessions/:id/readings` with temperature, humidity numbers

### Sensor data (MongoDB, from the ESP32)

The ESP32 pushes one reading every few seconds; each is stored in the
`sensor_readings` collection:

```json
{ "deviceId": "esp32-01", "temperature": 28.6, "humidity": 68.3, "recordedAt": "2026-10-24T02:11:47.523Z" }
```

- `POST /api/sensor/data` — body `{ temperature, humidity, deviceId?, recordedAt? }`
- `GET /api/sensor/data?deviceId=&limit=&since=` — newest-first-fetch, returned
  oldest→newest so it can be graphed directly (default limit 200, max 1000)
- `GET /api/sensor/latest?deviceId=` — latest reading plus `online` status
  (online = last reading ≤ 45 s old)
- `GET /api/sensor/devices` — distinct device ids with counts and lastSeen

Sensor endpoints return `503` while the database is not connected.

### Device command

- `GET /api/device/command` — the ESP32 polls this every 5 s and runs its
  drying-control loop **only while a session is active**:
  `{ "running": true, "sessionId": "...", "product": "Coconut", "estimatedHours": 12 }`
  → Start button (`POST /api/sessions`) sets it running; Stop button
  (`PATCH /api/sessions/:id`, status `stopped`) turns everything off. A failed
  poll never flips the device's local running state.

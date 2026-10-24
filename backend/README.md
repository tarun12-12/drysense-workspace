# DrySense backend

Small dependency-free HTTP API for the prototype. It uses in-memory state so the frontend can be connected later without committing to a database yet.

## Run

```powershell
cd backend
npm start
```

The server listens on `http://localhost:4000` by default. Set `PORT` to use another port.

## Endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/cycles`
- `GET /api/cycles/:id`
- `POST /api/cycles`
- `PATCH /api/cycles/:id` with `{ "status": "running|paused|stopped|completed" }`
- `POST /api/cycles/:id/readings` with temperature, humidity, moisture, and weight numbers

State resets when the server restarts. Database integration is intentionally deferred.

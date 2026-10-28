import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { URL } from 'node:url'
import { connectMongo, SensorReading, getMongoState } from './db.js'

const port = Number(process.env.PORT || 4000)

// ── Sensor (DHT11) helpers ───────────────────────────────────────────────────
// A DHT11 is considered offline when its last reading is older than this.
const SENSOR_STALE_MS = 45_000

// ── Products & moisture levels ───────────────────────────────────────────────
const PRODUCTS = ['Coconut', 'Chilli', 'Dhaal', 'Mango', 'Turmeric']
const MOISTURE_LEVELS = ['High Moisture', 'Medium Moisture', 'Low Moisture']

// ── Drying time model (hours) ────────────────────────────────────────────────
// Based on product hygroscopicity and solar irradiance averages
const DRYING_MODEL = {
  Coconut:  { 'High Moisture': 12, 'Medium Moisture': 9,  'Low Moisture': 6  },
  Chilli:   { 'High Moisture': 10, 'Medium Moisture': 7,  'Low Moisture': 4  },
  Dhaal:    { 'High Moisture': 7,  'Medium Moisture': 5,  'Low Moisture': 3  },
  Mango:    { 'High Moisture': 9,  'Medium Moisture': 7,  'Low Moisture': 5  },
  Turmeric: { 'High Moisture': 11, 'Medium Moisture': 8,  'Low Moisture': 6  },
}

function analyzeProduct(product, moistureLevel = 'Medium Moisture') {
  const effectiveMoisture = moistureLevel || 'Medium Moisture'
  const hours = DRYING_MODEL[product]?.[effectiveMoisture] || 8
  const tempRange  = product === 'Coconut' ? '45-55°C' : product === 'Chilli' ? '50-60°C' : product === 'Dhaal' ? '40-50°C' : '45-55°C'
  const confidence = effectiveMoisture === 'High Moisture' ? 88 : effectiveMoisture === 'Medium Moisture' ? 93 : 96
  return {
    estimatedHours: hours,
    confidence,
    tempRange,
    recommendation: `Optimal drying temperature for ${product} (${effectiveMoisture.toLowerCase()}) is ${tempRange}. Expected ${hours}h under full solar exposure.`,
  }
}

// ── Auth store ───────────────────────────────────────────────────────────────
const users = [
  {
    id: 'user-demo-001',
    name: 'Admin',
    email: 'admin@drysense.io',
    password: 'drysense123',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

// ── Drying sessions store ────────────────────────────────────────────────────
const sessions = []

// ── Helpers ──────────────────────────────────────────────────────────────────
function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function err(res, status, message) { sendJson(res, status, { error: message }) }

async function readBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  if (!body) return {}
  try { return JSON.parse(body) } catch { throw new Error('Request body must be valid JSON') }
}

function serializeSession(s, includeReadings = false) {
  const elapsedMs = s.stoppedAt
    ? new Date(s.stoppedAt) - new Date(s.startedAt)
    : s.startedAt ? Date.now() - new Date(s.startedAt) : 0
  const elapsedHours = elapsedMs / 3600000
  const remainingHours = s.status === 'running' ? Math.max(0, s.estimatedHours - elapsedHours) : 0
  const result = {
    id: s.id,
    product: s.product,
    moistureLevel: s.moistureLevel,
    status: s.status,
    estimatedHours: s.estimatedHours,
    startedAt: s.startedAt,
    stoppedAt: s.stoppedAt || null,
    elapsedMs: Math.round(elapsedMs),
    remainingHours: Number(remainingHours.toFixed(2)),
    readingCount: s.readings.length,
  }
  if (includeReadings) result.readings = s.readings
  return result
}

// ── Route handler ────────────────────────────────────────────────────────────
async function handle(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const parts = url.pathname.split('/').filter(Boolean)

  // Health
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'drysense-backend', timestamp: new Date().toISOString() })
  }

  // Options list
  if (req.method === 'GET' && url.pathname === '/api/options') {
    return sendJson(res, 200, { products: PRODUCTS, moistureLevels: MOISTURE_LEVELS })
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const body = await readBody(req)
    const { name, email, password } = body
    if (!name || name.trim().length < 2) return err(res, 400, 'Name must be at least 2 characters')
    if (!email || !email.includes('@')) return err(res, 400, 'A valid email is required')
    if (!password || password.length < 6) return err(res, 400, 'Password must be at least 6 characters')
    const normalEmail = email.trim().toLowerCase()
    if (users.find((u) => u.email === normalEmail)) return err(res, 409, 'An account with this email already exists')
    const user = { id: randomUUID(), name: name.trim(), email: normalEmail, password, role: 'operator', createdAt: new Date().toISOString() }
    users.push(user)
    const { password: _p, ...safe } = user
    return sendJson(res, 201, { user: safe })
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req)
    const { email, password } = body
    if (!email || !password) return err(res, 400, 'email and password are required')
    const u = users.find((u) => u.email === email.trim().toLowerCase() && u.password === password)
    if (!u) return err(res, 401, 'Invalid email or password')
    const { password: _p, ...safe } = u
    return sendJson(res, 200, { user: safe })
  }

  // ── AI Analysis endpoint ──────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/analyze') {
    const body = await readBody(req)
    const { product } = body
    const moistureLevel = body.moistureLevel || 'Medium Moisture'
    if (!product || !PRODUCTS.includes(product)) return err(res, 400, `product must be one of: ${PRODUCTS.join(', ')}`)
    const analysis = analyzeProduct(product, moistureLevel)
    return sendJson(res, 200, analysis)
  }

  // ── Sessions (drying cycles) ──────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/sessions') {
    return sendJson(res, 200, sessions.map((s) => serializeSession(s)))
  }

  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    const body = await readBody(req)
    const { product } = body
    const moistureLevel = body.moistureLevel || 'Medium Moisture'
    if (!product || !PRODUCTS.includes(product)) return err(res, 400, 'Invalid product')
    const estimatedHours = Number(body.estimatedHours) || DRYING_MODEL[product]?.[moistureLevel] || 8
    // Stop any currently running session
    sessions.forEach((s) => { if (s.status === 'running') { s.status = 'stopped'; s.stoppedAt = new Date().toISOString() } })
    const session = {
      id: randomUUID(),
      product,
      moistureLevel,
      estimatedHours,
      status: 'running',
      startedAt: new Date().toISOString(),
      stoppedAt: null,
      readings: [],
    }
    sessions.unshift(session)
    return sendJson(res, 201, serializeSession(session, true))
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2]) {
    const session = sessions.find((s) => s.id === parts[2])
    if (!session) return err(res, 404, 'Session not found')

    if (req.method === 'GET' && parts.length === 3) {
      return sendJson(res, 200, serializeSession(session, true))
    }

    if (req.method === 'PATCH' && parts.length === 3) {
      const body = await readBody(req)
      if (body.status === 'stopped' || body.status === 'completed') {
        session.status = body.status
        session.stoppedAt = new Date().toISOString()
        return sendJson(res, 200, serializeSession(session))
      }
      return err(res, 400, 'status must be stopped or completed')
    }

    if (req.method === 'POST' && parts[3] === 'readings') {
      const body = await readBody(req)
      const { temperature, humidity } = body
      if (typeof temperature !== 'number' || typeof humidity !== 'number') {
        return err(res, 400, 'temperature and humidity must be numbers')
      }
      const reading = { recordedAt: new Date().toISOString(), temperature, humidity }
      session.readings.push(reading)
      return sendJson(res, 201, reading)
    }
  }

  // ── Sensor data (DHT11 from ESP32) ────────────────────────────────────────
  // ESP32 pushes readings: POST /api/sensor/data {temperature, humidity, deviceId?}
  if (req.method === 'POST' && url.pathname === '/api/sensor/data') {
    if (getMongoState() !== 'connected') {
      return err(res, 503, 'Sensor storage is not available (database not connected)')
    }
    const body = await readBody(req)
    const temperature = Number(body.temperature)
    const humidity = Number(body.humidity)
    const deviceId = typeof body.deviceId === 'string' && body.deviceId ? body.deviceId.slice(0, 64) : 'esp32-01'
    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
      return err(res, 400, 'temperature and humidity must be numbers')
    }
    // DHT11 plausible range sanity check
    if (temperature < -40 || temperature > 80) return err(res, 400, 'temperature out of DHT11 range (-40..80°C)')
    if (humidity < 0 || humidity > 100) return err(res, 400, 'humidity out of range (0..100%)')
    // Fabricated timestamps are accepted (e.g. the device sends buffered data)
    let recordedAt = new Date()
    if (body.recordedAt) {
      const parsed = new Date(body.recordedAt)
      if (!Number.isNaN(parsed.getTime())) recordedAt = parsed
    }
    const reading = await SensorReading.create({ deviceId, temperature, humidity, recordedAt })
    return sendJson(res, 201, {
      id: String(reading._id),
      deviceId: reading.deviceId,
      temperature: reading.temperature,
      humidity: reading.humidity,
      recordedAt: reading.recordedAt,
    })
  }

  // Fetch readings for graphs/history: GET /api/sensor/data?deviceId=&limit=&since=
  if (req.method === 'GET' && url.pathname === '/api/sensor/data') {
    if (getMongoState() !== 'connected') {
      return err(res, 503, 'Sensor storage is not available (database not connected)')
    }
    const deviceId = url.searchParams.get('deviceId')
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 200, 1), 1000)
    const since = url.searchParams.get('since') ? new Date(url.searchParams.get('since')) : null
    const query = {}
    if (deviceId) query.deviceId = deviceId
    if (since && !Number.isNaN(since.getTime())) query.recordedAt = { $gte: since }
    const readings = await SensorReading.find(query).sort({ recordedAt: -1 }).limit(limit).lean()
    return sendJson(res, 200, readings.map((r) => ({
      id: String(r._id),
      deviceId: r.deviceId,
      temperature: r.temperature,
      humidity: r.humidity,
      recordedAt: new Date(r.recordedAt).toISOString(),
    })).reverse())
  }

  // Latest reading + device online status: GET /api/sensor/latest
  if (req.method === 'GET' && url.pathname === '/api/sensor/latest') {
    const state = getMongoState()
    if (state !== 'connected') {
      return sendJson(res, 200, { available: false, database: state })
    }
    const deviceId = url.searchParams.get('deviceId') || 'esp32-01'
    const latest = await SensorReading.findOne({ deviceId }).sort({ recordedAt: -1 }).lean()
    if (!latest) return sendJson(res, 200, { available: true, deviceId, reading: null, online: false })
    const ageMs = Date.now() - new Date(latest.recordedAt).getTime()
    return sendJson(res, 200, {
      available: true,
      deviceId,
      reading: {
        id: String(latest._id),
        deviceId: latest.deviceId,
        temperature: latest.temperature,
        humidity: latest.humidity,
        recordedAt: new Date(latest.recordedAt).toISOString(),
      },
      online: ageMs <= SENSOR_STALE_MS,
      ageMs,
    })
  }

  // Devices that have ever reported: GET /api/sensor/devices
  if (req.method === 'GET' && url.pathname === '/api/sensor/devices') {
    const state = getMongoState()
    if (state !== 'connected') return sendJson(res, 200, [])
    const devices = await SensorReading.aggregate([
      { $group: { _id: '$deviceId', count: { $sum: 1 }, lastSeen: { $max: '$recordedAt' } } },
      { $sort: { lastSeen: -1 } },
    ])
    return sendJson(res, 200, devices.map((d) => ({
      deviceId: d._id,
      readingCount: d.count,
      lastSeen: new Date(d.lastSeen).toISOString(),
    })))
  }

  // ── Device command (ESP32 polls this) ─────────────────────────────────────
  // The drying control loop only runs while a session is active in the app:
  // Start button → POST /api/sessions (status=running) → device runs.
  // Stop button  → PATCH /api/sessions/:id (status=stopped) → device stops.
  if (req.method === 'GET' && url.pathname === '/api/device/command') {
    const running = sessions.find((s) => s.status === 'running')
    return sendJson(res, 200, {
      running: !!running,
      sessionId: running ? running.id : null,
      product: running ? running.product : null,
      estimatedHours: running ? running.estimatedHours : null,
    })
  }

  return err(res, 404, 'Route not found')
}

createServer((req, res) => {
  handle(req, res).catch((e) => err(res, 400, e.message))
}).listen(port, () => {
  console.log(`DrySense backend listening on http://localhost:${port}`)
})

// Connect to MongoDB (sensor storage) shortly after startup
connectMongo()

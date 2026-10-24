import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_URL = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : 'http://10.0.2.2:4000/api'

let currentApiBase = DEFAULT_URL

export async function initApiBase() {
  try {
    const saved = await AsyncStorage.getItem('drysense_api_base')
    if (saved) currentApiBase = saved
  } catch (_) {}
  return currentApiBase
}

export function getApiBase() { return currentApiBase }

// ── Auth ─────────────────────────────────────────────────────────────────────
const AUTH_KEY = 'drysense_auth_user'
const DEMO_USERS = [
  { id: 'user-demo-001', name: 'Admin', email: 'admin@drysense.io', password: 'drysense123', role: 'admin' },
]

export async function loginUser(email, password) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(`${currentApiBase}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), signal: ctrl.signal,
    })
    clearTimeout(t)
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || 'Invalid credentials.' }
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data.user))
    return { success: true, user: data.user }
  } catch (_) {
    const demo = DEMO_USERS.find((u) => u.email === email && u.password === password)
    if (demo) {
      const user = { id: demo.id, name: demo.name, email: demo.email, role: demo.role }
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
      return { success: true, user }
    }
    return { success: false, error: 'Invalid email or password.' }
  }
}

export async function signupUser(name, email, password) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(`${currentApiBase}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }), signal: ctrl.signal,
    })
    clearTimeout(t)
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || 'Sign-up failed.' }
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data.user))
    return { success: true, user: data.user }
  } catch (_) {
    if (DEMO_USERS.find((u) => u.email === email)) return { success: false, error: 'Email already in use.' }
    const user = { id: `local-${Date.now().toString(36)}`, name, email, role: 'operator' }
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
    return { success: true, user }
  }
}

export async function getCurrentUser() {
  try { const r = await AsyncStorage.getItem(AUTH_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

export async function logoutUser() {
  try { await AsyncStorage.removeItem(AUTH_KEY) } catch (_) {}
}

// ── AI Analysis ───────────────────────────────────────────────────────────────
const LOCAL_MODEL = {
  Coconut:  { 'High Moisture': 12, 'Medium Moisture': 9,  'Low Moisture': 6  },
  Chilli:   { 'High Moisture': 10, 'Medium Moisture': 7,  'Low Moisture': 4  },
  Dhaal:    { 'High Moisture': 7,  'Medium Moisture': 5,  'Low Moisture': 3  },
  Mango:    { 'High Moisture': 9,  'Medium Moisture': 7,  'Low Moisture': 5  },
  Turmeric: { 'High Moisture': 11, 'Medium Moisture': 8,  'Low Moisture': 6  },
}

export async function analyzeProduct(product, moistureLevel = 'Medium Moisture') {
  const effectiveMoisture = moistureLevel || 'Medium Moisture'
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${currentApiBase}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, moistureLevel: effectiveMoisture }), signal: ctrl.signal,
    })
    clearTimeout(t)
    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    }
  } catch (_) {}

  // Local calculation fallback
  const hours = LOCAL_MODEL[product]?.[effectiveMoisture] || 8
  const tempRange = product === 'Coconut' ? '45-55°C' : product === 'Chilli' ? '50-60°C' : product === 'Dhaal' ? '40-50°C' : '45-55°C'
  return {
    success: true,
    data: {
      estimatedHours: hours,
      confidence: effectiveMoisture === 'High Moisture' ? 88 : effectiveMoisture === 'Medium Moisture' ? 93 : 96,
      tempRange,
      recommendation: `Optimal drying for ${product} (${effectiveMoisture.toLowerCase()}) is ${tempRange}. Expected ${hours}h under solar exposure.`,
    },
  }
}

// ── Sessions Storage & Sync ───────────────────────────────────────────────────
const SESSIONS_STORAGE_KEY = 'drysense_sessions_store'

async function getStoredSessions() {
  try {
    const val = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY)
    return val ? JSON.parse(val) : []
  } catch (_) {
    return []
  }
}

async function saveStoredSessions(list) {
  try {
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(list))
  } catch (_) {}
}

export async function fetchSessions() {
  let remoteList = []
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${currentApiBase}/sessions`, { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) remoteList = await res.json()
  } catch (_) {}

  const localList = await getStoredSessions()
  // Merge remote and local by id
  const map = new Map()
  for (const s of localList) map.set(s.id, s)
  for (const s of remoteList) map.set(s.id, s)
  const combined = Array.from(map.values()).sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0))
  return { success: true, data: combined }
}

export async function fetchSession(id) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${currentApiBase}/sessions/${id}`, { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) return { success: true, data: await res.json() }
  } catch (_) {}

  const localList = await getStoredSessions()
  const found = localList.find((x) => x.id === id)
  return { success: !!found, data: found || null }
}

export async function startSession(product, moistureLevel = 'Medium Moisture', estimatedHours = 8) {
  const effectiveMoisture = moistureLevel || 'Medium Moisture'
  let session = null

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${currentApiBase}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, moistureLevel: effectiveMoisture, estimatedHours }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (res.ok) {
      session = await res.json()
    }
  } catch (_) {}

  if (!session) {
    session = {
      id: `sess-${Date.now().toString(36)}`,
      product,
      moistureLevel: effectiveMoisture,
      estimatedHours: Number(estimatedHours) || 8,
      status: 'running',
      startedAt: new Date().toISOString(),
      stoppedAt: null,
      elapsedMs: 0,
      remainingHours: Number(estimatedHours) || 8,
      readingCount: 0,
      readings: [],
    }
  }

  // Update local storage
  const list = await getStoredSessions()
  list.forEach((s) => {
    if (s.status === 'running') {
      s.status = 'stopped'
      s.stoppedAt = s.stoppedAt || new Date().toISOString()
    }
  })
  list.unshift(session)
  await saveStoredSessions(list)

  return { success: true, data: session }
}

export async function stopSession(id) {
  try {
    await fetch(`${currentApiBase}/sessions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stopped' }),
    }).catch(() => {})
  } catch (_) {}

  const list = await getStoredSessions()
  const s = list.find((x) => x.id === id)
  if (s) {
    s.status = 'stopped'
    s.stoppedAt = s.stoppedAt || new Date().toISOString()
    await saveStoredSessions(list)
  }
  return { success: true, data: s }
}

export async function addReading(sessionId, temperature, humidity) {
  const reading = { recordedAt: new Date().toISOString(), temperature, humidity }
  try {
    fetch(`${currentApiBase}/sessions/${sessionId}/readings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temperature, humidity }),
    }).catch(() => {})
  } catch (_) {}

  const list = await getStoredSessions()
  const s = list.find((x) => x.id === sessionId)
  if (s) {
    if (!s.readings) s.readings = []
    s.readings.push(reading)
    s.readingCount = s.readings.length
    await saveStoredSessions(list)
  }
  return { success: true }
}

export async function fetchHealth() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${currentApiBase}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    return await res.json()
  } catch (_) {
    return { ok: false }
  }
}

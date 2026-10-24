import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// ── SensorReading model (DHT11 data from ESP32) ──────────────────────────────
const sensorReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, default: 'esp32-01', index: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'sensor_readings' },
)
sensorReadingSchema.index({ deviceId: 1, recordedAt: -1 })

export const SensorReading =
  mongoose.models.SensorReading || mongoose.model('SensorReading', sensorReadingSchema)

let mongoState = 'disconnected'

export function getMongoState() { return mongoState }

// ── Connection ───────────────────────────────────────────────────────────────
export async function connectMongo() {
  const uri = process.env.MONGO_URL
  if (!uri) {
    mongoState = 'unconfigured'
    console.warn('[db] MONGO_URL is not set — sensor storage will be unavailable')
    return false
  }

  mongoState = 'connecting'
  mongoose.connection.on('connected', () => { mongoState = 'connected'; console.log('[db] MongoDB connected') })
  mongoose.connection.on('disconnected', () => { mongoState = 'disconnected'; console.warn('[db] MongoDB disconnected') })
  mongoose.connection.on('error', (e) => { console.error('[db] MongoDB error:', e.message) })

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
    return true
  } catch (e) {
    mongoState = 'error'
    console.error('[db] Failed to connect to MongoDB:', e.message)
    return false
  }
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'
import { fetchSensorData, fetchLatestSensor, fetchSensorDevices } from '../api'
import { SensorTimeChart } from './Charts'

const DEFAULT_DEVICE = 'esp32-01'
// Auto-refresh cadence while the tab is visible (fits ESP32 default 10 s push rate)
const POLL_MS = 10000

function formatAge(ms) {
  if (ms == null) return '--'
  if (ms < 60000) return `${Math.max(1, Math.round(ms / 1000))}s ago`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`
  const h = Math.floor(ms / 3600000)
  return `${h}h ${Math.round((ms % 3600000) / 60000)}m ago`
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return iso }
}

function SensorStatCard({ icon, label, value, unit, color, glow }) {
  return (
    <View style={[statStyles.card, { borderColor: `${color}55` }]}>
      <View style={[statStyles.iconBox, { backgroundColor: glow }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>
        {value != null ? value : '--'}
        <Text style={statStyles.unit}> {unit}</Text>
      </Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: 130,
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, padding: 14, gap: 6,
  },
  iconBox: { width: 40, height: 40, borderRadius: THEME.radii.md, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, fontWeight: '900', color: THEME.colors.textPrimary },
  unit: { fontSize: 12, fontWeight: '600', color: THEME.colors.textMuted },
  label: { fontSize: 10, fontWeight: '700', color: THEME.colors.textMuted, letterSpacing: 0.5 },
})

function DeviceChip({ device, active, onPress }) {
  return (
    <TouchableOpacity
      style={[chipStyles.chip, active && chipStyles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="hardware-chip-outline"
        size={13}
        color={active ? THEME.colors.primary : THEME.colors.textMuted}
      />
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>{device}</Text>
    </TouchableOpacity>
  )
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: THEME.radii.full, borderWidth: 1,
    borderColor: THEME.colors.cardBorder, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  chipActive: { borderColor: THEME.colors.primary, backgroundColor: 'rgba(16,185,129,0.08)' },
  chipText: { color: THEME.colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: THEME.colors.primary },
})

function HistoryRow({ reading }) {
  return (
    <View style={histStyles.row}>
      <Ionicons name="pulse-outline" size={13} color={THEME.colors.textMuted} />
      <Text style={histStyles.time}>{formatTime(reading.recordedAt)}</Text>
      <View style={histStyles.grow} />
      <Text style={[histStyles.metric, { color: THEME.colors.temp }]}>
        {reading.temperature}°C
      </Text>
      <Text style={[histStyles.metric, { color: THEME.colors.humidity }]}>
        {reading.humidity}%
      </Text>
    </View>
  )
}

const histStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: THEME.colors.cardBorder,
  },
  time: { color: THEME.colors.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
  grow: { flex: 1 },
  metric: { fontSize: 13, fontWeight: '700', minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
})

export function SensorsTab({ refreshKey }) {
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE)
  const [devices, setDevices] = useState([])
  const [readings, setReadings] = useState([])
  const [latest, setLatest] = useState(null) // { reading, online, ageMs }
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => () => { mounted.current = false }, [])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)

    const devicesRes = await fetchSensorDevices()
    if (mounted.current && devicesRes.success) {
      setDevices(devicesRes.data)
      // Auto-select the device with the most recent reading unless the user
      // already picked one manually or the saved device no longer has data.
      if (deviceId === DEFAULT_DEVICE && devicesRes.data.length > 0) {
        const first = devicesRes.data[0]
        if (first.deviceId && first.deviceId !== deviceId) {
          setDeviceId(first.deviceId)
        }
      }
    }

    const activeId = deviceId === DEFAULT_DEVICE && devicesRes.data[0]?.deviceId
      ? devicesRes.data[0].deviceId
      : deviceId

    const [latestRes, dataRes] = await Promise.all([
      fetchLatestSensor(activeId),
      fetchSensorData(activeId, 200),
    ])

    if (!mounted.current) return

    if (latestRes.success) setLatest(latestRes.data)
    if (dataRes.success) {
      setReadings(dataRes.data)
      setError(null)
    } else {
      setError(dataRes.error)
    }
    setLoading(false)
    setRefreshing(false)
  }, [deviceId])

  // Load on mount, manual refresh, and device change (deferred to a timer so
  // setState isn't called synchronously inside the effect body)
  useEffect(() => {
    const id = setTimeout(() => load(), 0)
    return () => clearTimeout(id)
  }, [load, refreshKey])

  // Live polling — keeps graph moving as ESP32 pushes new readings
  useEffect(() => {
    const timer = setInterval(() => load(true), POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const online = !!latest?.online
  const tempSeries = readings.map((r) => r.temperature)
  const humSeries = readings.map((r) => r.humidity)
  const avgTemp = tempSeries.length ? (tempSeries.reduce((a, b) => a + b, 0) / tempSeries.length).toFixed(1) : null
  const avgHum = humSeries.length ? (humSeries.reduce((a, b) => a + b, 0) / humSeries.length).toFixed(1) : null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={THEME.colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DHT11 LIVE TELEMETRY</Text>
        <Text style={styles.title}>Sensors</Text>
        <Text style={styles.subtitle}>Temperature & humidity pushed by the ESP32 over WiFi.</Text>
      </View>

      {/* Device selector (when multiple ESP32 devices exist) */}
      {devices.length > 1 && (
        <View style={styles.deviceRow}>
          {devices.map((d) => (
            <DeviceChip key={d.deviceId} device={d.deviceId} active={d.deviceId === deviceId} onPress={() => setDeviceId(d.deviceId)} />
          ))}
        </View>
      )}

      {/* Device status card */}
      {!loading && (
        <View style={[styles.statusCard, online ? styles.statusOnline : styles.statusOffline]}>
          <View style={[styles.statusDot, { backgroundColor: online ? THEME.colors.primary : THEME.colors.danger }]} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>{online ? 'Device online' : 'Device offline'}</Text>
            <Text style={styles.statusSub}>
              {latest?.reading
                ? `${activeLabel(deviceId)} • last reading ${formatAge(latest.ageMs)}`
                : 'No readings received yet'}
            </Text>
          </View>
          <Ionicons name="hardware-chip-outline" size={22} color={THEME.colors.textMuted} />
        </View>
      )}

      {/* Current values */}
      <View style={styles.statRow}>
        <SensorStatCard
          icon="thermometer-outline" label="TEMPERATURE"
          value={latest?.reading?.temperature ?? avgTemp} unit="°C"
          color={THEME.colors.temp} glow={THEME.colors.tempGlow}
        />
        <SensorStatCard
          icon="water-outline" label="HUMIDITY"
          value={latest?.reading?.humidity ?? avgHum} unit="%"
          color={THEME.colors.humidity} glow={THEME.colors.humidityGlow}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading sensor data…</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>Can&apos;t reach sensor data</Text>
          <Text style={styles.emptySubtitle}>
            {error === 'HTTP 503' ? 'The backend database is not connected.' : 'Make sure the backend is running and the ESP32 is online.'}
          </Text>
        </View>
      ) : (
        <>
          {/* Graph */}
          <SensorTimeChart readings={readings} />

          {/* History */}
          <Text style={styles.sectionTitle}>Recent readings ({readings.length})</Text>
          <View style={styles.historyCard}>
            {readings.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={styles.emptySubtitle}>No readings stored for this device yet.</Text>
              </View>
            ) : (
              readings.slice().reverse().map((r) => <HistoryRow key={r.id} reading={r} />)
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function activeLabel(deviceId) {
  return deviceId ? `device “${deviceId}”` : 'device'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  content: { padding: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: THEME.colors.primary, letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: THEME.colors.textPrimary },
  subtitle: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2 },
  deviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, padding: 14, marginBottom: 12,
  },
  statusOnline: { borderColor: 'rgba(16,185,129,0.35)' },
  statusOffline: { borderColor: 'rgba(239,68,68,0.3)' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '800', color: THEME.colors.textPrimary },
  statusSub: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  loadingBox: { alignItems: 'center', padding: 40, gap: 10 },
  loadingText: { color: THEME.colors.textMuted },
  emptyState: { alignItems: 'center', padding: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textSecondary },
  emptySubtitle: { fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: THEME.colors.textSecondary, letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  historyCard: {
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, overflow: 'hidden',
  },
})

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Svg, Polyline, Line, Text as SvgText, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg'
import { THEME } from '../theme'
import { fetchSessions, fetchSession } from '../api'

const SCREEN_W = Dimensions.get('window').width
const CHART_W = Math.min(SCREEN_W - 64, 660)
const CHART_H = 160
const PAD = { top: 16, right: 16, bottom: 30, left: 44 }
const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom

function LineChart({ readings, dataKey, color, label, unit, gradientId }) {
  if (!readings || readings.length < 2) {
    return (
      <View style={chartStyles.emptyChart}>
        <Ionicons name="analytics-outline" size={28} color={THEME.colors.textMuted} />
        <Text style={chartStyles.emptyText}>Not enough data yet</Text>
      </View>
    )
  }

  const values = readings.map((r) => r[dataKey])
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const padded_min = minV - range * 0.1
  const padded_max = maxV + range * 0.1
  const padded_range = padded_max - padded_min

  const xScale = (i) => PAD.left + (i / (readings.length - 1)) * INNER_W
  const yScale = (v) => PAD.top + INNER_H - ((v - padded_min) / padded_range) * INNER_H

  const points = readings.map((r, i) => `${xScale(i).toFixed(1)},${yScale(r[dataKey]).toFixed(1)}`).join(' ')

  // Build path for filled area
  const areaPath = [
    `M ${xScale(0).toFixed(1)} ${(PAD.top + INNER_H).toFixed(1)}`,
    ...readings.map((r, i) => `L ${xScale(i).toFixed(1)} ${yScale(r[dataKey]).toFixed(1)}`),
    `L ${xScale(readings.length - 1).toFixed(1)} ${(PAD.top + INNER_H).toFixed(1)}`,
    'Z',
  ].join(' ')

  // Y axis ticks
  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = padded_min + (padded_range * i) / tickCount
    return { v, y: yScale(v) }
  })

  // X axis labels (show up to 5)
  const xLabelStep = Math.max(1, Math.floor(readings.length / 5))
  const xLabels = readings
    .map((r, i) => ({ i, t: new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
    .filter((_, i) => i % xLabelStep === 0 || i === readings.length - 1)

  const latest = values[values.length - 1]

  return (
    <View style={chartStyles.chartWrap}>
      <View style={chartStyles.chartHeader}>
        <View style={[chartStyles.colorDot, { backgroundColor: color }]} />
        <Text style={chartStyles.chartLabel}>{label}</Text>
        <View style={[chartStyles.valuePill, { backgroundColor: `${color}20` }]}>
          <Text style={[chartStyles.valueText, { color }]}>{Number(latest).toFixed(1)} {unit}</Text>
        </View>
      </View>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {ticks.map((t, i) => (
          <React.Fragment key={i}>
            <Line x1={PAD.left} y1={t.y} x2={PAD.left + INNER_W} y2={t.y}
              stroke={THEME.colors.cardBorder} strokeWidth="1" strokeDasharray="4 4" />
            <SvgText x={PAD.left - 6} y={t.y + 4} textAnchor="end"
              fill={THEME.colors.textMuted} fontSize="9">
              {Number(t.v).toFixed(0)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X axis labels */}
        {xLabels.map(({ i, t }) => (
          <SvgText key={i} x={xScale(i)} y={CHART_H - 4} textAnchor="middle"
            fill={THEME.colors.textMuted} fontSize="9">
            {t}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Last point dot */}
        <Circle cx={xScale(readings.length - 1)} cy={yScale(latest)} r="4"
          fill={color} stroke={THEME.colors.bg} strokeWidth="2" />
      </Svg>
    </View>
  )
}

const chartStyles = StyleSheet.create({
  emptyChart: {
    height: CHART_H, alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: THEME.radii.md,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, color: THEME.colors.textMuted },
  chartWrap: { marginBottom: 4 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  chartLabel: { fontSize: 12, fontWeight: '700', color: THEME.colors.textPrimary, flex: 1 },
  valuePill: { borderRadius: THEME.radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  valueText: { fontSize: 12, fontWeight: '800' },
})

export function AnalyticsTab() {
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSessions = useCallback(async () => {
    const res = await fetchSessions()
    if (res.success) {
      setSessions(res.data)
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id)
      }
    }
    setLoading(false)
  }, [selectedId])

  useEffect(() => { loadSessions() }, [])

  useEffect(() => {
    if (!selectedId) return
    async function loadReadings() {
      const res = await fetchSession(selectedId)
      if (res.success && res.data?.readings) {
        setReadings(res.data.readings)
      }
    }
    loadReadings()
    const t = setInterval(loadReadings, 5000)
    return () => clearInterval(t)
  }, [selectedId])

  const selectedSession = sessions.find((s) => s.id === selectedId)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DATA ANALYSIS</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Temperature and humidity trends across drying sessions.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={52} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySubtitle}>Start a drying session from the Dashboard to see analytics here.</Text>
        </View>
      ) : (
        <>
          {/* Session picker */}
          <View style={styles.pickerCard}>
            <Text style={styles.pickerLabel}>SESSION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              {sessions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickerChip, selectedId === s.id && styles.pickerChipActive]}
                  onPress={() => { setSelectedId(s.id); setReadings([]) }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickerChipText, selectedId === s.id && styles.pickerChipTextActive]}>
                    {s.product}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: s.status === 'running' ? THEME.colors.primary : THEME.colors.textMuted }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedSession && (
            <View style={styles.sessionMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="leaf-outline" size={13} color={THEME.colors.primary} />
                <Text style={styles.metaText}>{selectedSession.product} · {selectedSession.moistureLevel}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={THEME.colors.textMuted} />
                <Text style={styles.metaText}>
                  {selectedSession.status === 'running' ? 'Running' : 'Completed'} · {selectedSession.readingCount} readings
                </Text>
              </View>
            </View>
          )}

          {/* Temperature chart */}
          <View style={styles.card}>
            <LineChart
              readings={readings}
              dataKey="temperature"
              color={THEME.colors.temp}
              label="Temperature"
              unit="°C"
              gradientId="tempGrad"
            />
          </View>

          {/* Humidity chart */}
          <View style={styles.card}>
            <LineChart
              readings={readings}
              dataKey="humidity"
              color={THEME.colors.humidity}
              label="Humidity"
              unit="%"
              gradientId="humidGrad"
            />
          </View>

          {readings.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Reading Summary</Text>
              <View style={styles.summaryGrid}>
                {[
                  { label: 'Max Temp', value: `${Math.max(...readings.map((r) => r.temperature)).toFixed(1)} °C`, color: THEME.colors.temp },
                  { label: 'Min Temp', value: `${Math.min(...readings.map((r) => r.temperature)).toFixed(1)} °C`, color: THEME.colors.temp },
                  { label: 'Max Humid', value: `${Math.max(...readings.map((r) => r.humidity)).toFixed(1)} %`, color: THEME.colors.humidity },
                  { label: 'Min Humid', value: `${Math.min(...readings.map((r) => r.humidity)).toFixed(1)} %`, color: THEME.colors.humidity },
                ].map((s) => (
                  <View key={s.label} style={styles.summaryItem}>
                    <Text style={styles.summaryItemLabel}>{s.label}</Text>
                    <Text style={[styles.summaryItemValue, { color: s.color }]}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  content: { padding: 16, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: THEME.colors.primary, letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: THEME.colors.textPrimary },
  subtitle: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2 },
  loadingBox: { alignItems: 'center', padding: 40 },
  loadingText: { color: THEME.colors.textMuted },
  emptyState: { alignItems: 'center', padding: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textSecondary },
  emptySubtitle: { fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center' },
  pickerCard: {
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, padding: 14, marginBottom: 14,
  },
  pickerLabel: { fontSize: 9, fontWeight: '700', color: THEME.colors.textMuted, letterSpacing: 1, marginBottom: 10 },
  pickerScroll: { flexDirection: 'row' },
  pickerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: THEME.radii.full,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: THEME.colors.cardBorder, marginRight: 8,
  },
  pickerChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: THEME.colors.primary },
  pickerChipText: { fontSize: 13, color: THEME.colors.textMuted },
  pickerChipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  sessionMeta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: 14, paddingHorizontal: 2,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: THEME.colors.textMuted },
  card: {
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, padding: 16, marginBottom: 14,
    overflow: 'hidden',
  },
  summaryCard: {
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, padding: 16, marginBottom: 14,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: THEME.colors.textPrimary, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { flex: 1, minWidth: 120, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: THEME.radii.md, padding: 12 },
  summaryItemLabel: { fontSize: 10, color: THEME.colors.textMuted, marginBottom: 4 },
  summaryItemValue: { fontSize: 18, fontWeight: '800' },
})

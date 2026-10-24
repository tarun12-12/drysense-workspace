import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
  Polyline,
} from 'react-native-svg'
import { THEME } from '../theme'

export function MiniTrendChart({
  type = 'Metric',
  color = THEME.colors.primary,
  values = [20, 25, 30, 35, 40],
  labels = ['08:00', '09:00', '10:00', '11:00', '12:00'],
  unit = '',
  width = 280,
  height = 80,
}) {
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal

  const padX = 14
  const padY = 12

  const points = values.map((val, idx) => {
    const x = padX + (idx / Math.max(values.length - 1, 1)) * (width - 2 * padX)
    const norm = (val - minVal) / range
    const y = height - padY - norm * (height - 2 * padY)
    return { x, y, val, label: labels[idx] || '' }
  })

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = points.length > 0
    ? `M ${points[0].x},${height - padY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${height - padY} Z`
    : ''

  const gradientId = `grad-${type.toLowerCase().replace(/[^a-z0-9]/g, '')}`

  return (
    <View style={styles.miniChartContainer}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Faint Grid Lines */}
        {[0.2, 0.5, 0.8].map((ratio) => {
          const y = padY + ratio * (height - 2 * padY)
          return (
            <Line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )
        })}

        {/* Gradient Area Fill */}
        {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}

        {/* Polyline */}
        <Polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, idx) => (
          <G key={idx}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={3}
              fill={color}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </G>
        ))}
      </Svg>

      {/* Label Row */}
      <View style={styles.miniLabelsRow}>
        {labels.map((lbl, i) => (
          <Text key={i} style={styles.miniLabelText}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  )
}

export function DetailedTelemetryChart({ readings = [], targetMoisture = 12 }) {
  const [activeSeries, setActiveSeries] = useState('moisture')

  if (!readings || readings.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>No telemetry recorded for this cycle yet.</Text>
      </View>
    )
  }

  const seriesMeta = {
    moisture: { label: 'Moisture', unit: '%', color: THEME.colors.moisture, baseline: targetMoisture },
    temperature: { label: 'Temp', unit: '°C', color: THEME.colors.temp },
    humidity: { label: 'Humidity', unit: '% RH', color: THEME.colors.humidity },
    weight: { label: 'Weight', unit: 'kg', color: THEME.colors.weight },
  }

  const current = seriesMeta[activeSeries]
  const rawValues = readings.map((r) => r[activeSeries] ?? 0)
  const minVal = Math.min(...rawValues, current.baseline ?? 999)
  const maxVal = Math.max(...rawValues)
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal

  const screenWidth = Dimensions.get('window').width
  const chartWidth = Math.min(screenWidth - 48, 640)
  const chartHeight = 210

  const padLeft = 40
  const padRight = 16
  const padTop = 24
  const padBottom = 32

  const points = readings.map((r, idx) => {
    const x = padLeft + (idx / Math.max(readings.length - 1, 1)) * (chartWidth - padLeft - padRight)
    const val = r[activeSeries] ?? 0
    const norm = (val - minVal) / range
    const y = chartHeight - padBottom - norm * (chartHeight - padTop - padBottom)
    const time = new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return { x, y, val, time, raw: r }
  })

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = points.length > 0
    ? `M ${points[0].x},${chartHeight - padBottom} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${chartHeight - padBottom} Z`
    : ''

  let baselineY = null
  if (activeSeries === 'moisture' && current.baseline != null) {
    const norm = (current.baseline - minVal) / range
    baselineY = chartHeight - padBottom - norm * (chartHeight - padTop - padBottom)
  }

  const latestVal = rawValues[rawValues.length - 1]

  return (
    <View style={styles.detailedContainer}>
      {/* Series Selector Buttons */}
      <View style={styles.seriesRow}>
        <View style={styles.seriesBtnsGroup}>
          {Object.entries(seriesMeta).map(([key, meta]) => {
            const isSelected = activeSeries === key
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.seriesButton,
                  isSelected && { borderColor: meta.color, backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
                onPress={() => setActiveSeries(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.seriesDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.seriesButtonText, isSelected && { color: meta.color, fontWeight: '700' }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.latestValueBadge}>
          <Text style={styles.latestLabel}>Latest:</Text>
          <Text style={[styles.latestValue, { color: current.color }]}>
            {latestVal} {current.unit}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id={`grad-detail-${activeSeries}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={current.color} stopOpacity="0.28" />
              <Stop offset="100%" stopColor={current.color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines and Y-axis values */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = padTop + ratio * (chartHeight - padTop - padBottom)
            const gridVal = (maxVal - ratio * range).toFixed(activeSeries === 'weight' ? 2 : 1)
            return (
              <G key={ratio}>
                <Line
                  x1={padLeft}
                  x2={chartWidth - padRight}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <SvgText
                  x={padLeft - 6}
                  y={y + 3.5}
                  fill={THEME.colors.textMuted}
                  fontSize="9"
                  textAnchor="end"
                >
                  {gridVal}
                </SvgText>
              </G>
            )
          })}

          {/* Baseline safe threshold line */}
          {baselineY != null && baselineY >= padTop && baselineY <= chartHeight - padBottom && (
            <G>
              <Line
                x1={padLeft}
                x2={chartWidth - padRight}
                y1={baselineY}
                y2={baselineY}
                stroke={THEME.colors.danger}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <SvgText
                x={chartWidth - padRight}
                y={baselineY - 4}
                fill={THEME.colors.danger}
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                Safe Target: {current.baseline}%
              </SvgText>
            </G>
          )}

          {/* Gradient area */}
          {areaPath ? <Path d={areaPath} fill={`url(#grad-detail-${activeSeries})`} /> : null}

          {/* Line */}
          <Polyline
            points={polylineStr}
            fill="none"
            stroke={current.color}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => (
            <G key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill={current.color}
                stroke="#ffffff"
                strokeWidth={1.8}
              />
              <SvgText
                x={p.x}
                y={p.y - 7}
                fill={THEME.colors.textPrimary}
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.val}
              </SvgText>
              <SvgText
                x={p.x}
                y={chartHeight - padBottom + 16}
                fill={THEME.colors.textMuted}
                fontSize="9"
                textAnchor="middle"
              >
                {p.time}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
    </View>
  )
}

// Sensor telemetry chart — temperature / humidity readings from the DHT11
export function SensorTimeChart({ readings = [] }) {
  const [activeSeries, setActiveSeries] = useState('temperature')

  if (!readings || readings.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>No sensor data received yet.</Text>
        <Text style={styles.emptyText}>Waiting for the ESP32 to send readings…</Text>
      </View>
    )
  }

  const seriesMeta = {
    temperature: { label: 'Temp', unit: '°C', color: THEME.colors.temp },
    humidity: { label: 'Humidity', unit: '% RH', color: THEME.colors.humidity },
  }

  const current = seriesMeta[activeSeries]
  const rawValues = readings.map((r) => r[activeSeries] ?? 0)
  const minVal = Math.min(...rawValues)
  const maxVal = Math.max(...rawValues)
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal

  const screenWidth = Dimensions.get('window').width
  const chartWidth = Math.min(screenWidth - 48, 640)
  const chartHeight = 210

  const padLeft = 40
  const padRight = 16
  const padTop = 24
  const padBottom = 32

  const points = readings.map((r, idx) => {
    const x = padLeft + (idx / Math.max(readings.length - 1, 1)) * (chartWidth - padLeft - padRight)
    const val = r[activeSeries] ?? 0
    const norm = (val - minVal) / range
    const y = chartHeight - padBottom - norm * (chartHeight - padTop - padBottom)
    const time = new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return { x, y, val, time, raw: r }
  })

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = points.length > 0
    ? `M ${points[0].x},${chartHeight - padBottom} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${chartHeight - padBottom} Z`
    : ''

  const latestVal = rawValues[rawValues.length - 1]
  // Show at most 6 time labels under the x axis
  const labelEvery = Math.max(Math.ceil(points.length / 6), 1)

  return (
    <View style={styles.detailedContainer}>
      {/* Series Selector Buttons */}
      <View style={styles.seriesRow}>
        <View style={styles.seriesBtnsGroup}>
          {Object.entries(seriesMeta).map(([key, meta]) => {
            const isSelected = activeSeries === key
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.seriesButton,
                  isSelected && { borderColor: meta.color, backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
                onPress={() => setActiveSeries(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.seriesDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.seriesButtonText, isSelected && { color: meta.color, fontWeight: '700' }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.latestValueBadge}>
          <Text style={styles.latestLabel}>Latest:</Text>
          <Text style={[styles.latestValue, { color: current.color }]}>
            {latestVal} {current.unit}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id={`grad-sensor-${activeSeries}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={current.color} stopOpacity="0.28" />
              <Stop offset="100%" stopColor={current.color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines and Y-axis values */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = padTop + ratio * (chartHeight - padTop - padBottom)
            const gridVal = (maxVal - ratio * range).toFixed(1)
            return (
              <G key={ratio}>
                <Line
                  x1={padLeft}
                  x2={chartWidth - padRight}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <SvgText
                  x={padLeft - 6}
                  y={y + 3.5}
                  fill={THEME.colors.textMuted}
                  fontSize="9"
                  textAnchor="end"
                >
                  {gridVal}
                </SvgText>
              </G>
            )
          })}

          {/* Gradient area */}
          {areaPath ? <Path d={areaPath} fill={`url(#grad-sensor-${activeSeries})`} /> : null}

          {/* Line */}
          <Polyline
            points={polylineStr}
            fill="none"
            stroke={current.color}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points — thinned when there are many readings */}
          {points
            .filter((_, idx) => points.length <= 24 || idx % Math.ceil(points.length / 24) === 0 || idx === points.length - 1)
            .map((p, idx) => (
              <G key={idx}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={current.color}
                  stroke="#ffffff"
                  strokeWidth={1.8}
                />
              </G>
            ))}

          {/* X axis time labels */}
          {points
            .filter((p, idx) => idx % labelEvery === 0 || idx === points.length - 1)
            .map((p, idx) => (
              <SvgText
                key={idx}
                x={p.x}
                y={chartHeight - padBottom + 16}
                fill={THEME.colors.textMuted}
                fontSize="9"
                textAnchor="middle"
              >
                {p.time}
              </SvgText>
            ))}
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  miniChartContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  miniLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  miniLabelText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
  },
  emptyChart: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.md,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  detailedContainer: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 14,
    marginVertical: 12,
  },
  seriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  seriesBtnsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  seriesDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  seriesButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  latestValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  latestLabel: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  latestValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})

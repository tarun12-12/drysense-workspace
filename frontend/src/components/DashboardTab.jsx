import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'
import { analyzeProduct, startSession, stopSession, addReading, fetchSessions } from '../api'

const PRODUCTS = [
  { id: 'Coconut',  icon: 'nutrition-outline',      color: '#f59e0b', desc: 'Copra & kernel drying' },
  { id: 'Chilli',   icon: 'flame-outline',          color: '#ef4444', desc: 'Red pepper dehydration' },
  { id: 'Dhaal',    icon: 'leaf-outline',           color: '#10b981', desc: 'Pulses & lentils' },
  { id: 'Mango',    icon: 'sunny-outline',          color: '#f97316', desc: 'Fruit slice preservation' },
  { id: 'Turmeric', icon: 'color-filter-outline',   color: '#eab308', desc: 'Rhizome curing & drying' },
]

const MOISTURE_LEVELS = [
  { id: 'High Moisture',   desc: 'Freshly harvested (>60%)' },
  { id: 'Medium Moisture', desc: 'Pre-wilted / semi-dry (~40%)' },
  { id: 'Low Moisture',    desc: 'Low residual moisture (~20%)' },
]

function pad(n) { return String(n).padStart(2, '0') }

function formatDuration(ms) {
  if (!ms || ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function formatHours(h) {
  if (h <= 0) return '0h 0m'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}h ${mm}m`
}

// ─── Modal Dropdown Component (100% immune to RN z-index/clipping bugs) ───────
function DropdownPicker({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((o) => o.id === value)

  return (
    <View style={ddStyles.wrap}>
      <Text style={ddStyles.label}>{label}</Text>

      {/* Dropdown trigger box */}
      <TouchableOpacity
        style={[
          ddStyles.trigger,
          isOpen && ddStyles.triggerActive,
          disabled && ddStyles.triggerDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={ddStyles.triggerContent}>
          {selectedOption?.icon ? (
            <Ionicons
              name={selectedOption.icon}
              size={18}
              color={selectedOption.color || THEME.colors.primary}
              style={ddStyles.leftIcon}
            />
          ) : (
            <Ionicons
              name="cube-outline"
              size={18}
              color={THEME.colors.textMuted}
              style={ddStyles.leftIcon}
            />
          )}
          <Text
            style={[
              ddStyles.triggerText,
              !selectedOption && ddStyles.placeholderText,
            ]}
          >
            {selectedOption ? selectedOption.id : placeholder}
          </Text>
        </View>

        <View style={ddStyles.arrowBox}>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={isOpen ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* Dropdown Options Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={ddStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={ddStyles.modalContent}>
                <View style={ddStyles.modalHeader}>
                  <Text style={ddStyles.modalTitle}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={ddStyles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={ddStyles.optionsList} bounces={false}>
                  {options.map((opt) => {
                    const isSelected = opt.id === value
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          ddStyles.optionRow,
                          isSelected && ddStyles.optionRowSelected,
                        ]}
                        onPress={() => {
                          onChange(opt.id)
                          setIsOpen(false)
                        }}
                        activeOpacity={0.75}
                      >
                        {opt.icon && (
                          <View
                            style={[
                              ddStyles.optIconBox,
                              { backgroundColor: `${opt.color || THEME.colors.primary}20` },
                            ]}
                          >
                            <Ionicons
                              name={opt.icon}
                              size={20}
                              color={opt.color || THEME.colors.primary}
                            />
                          </View>
                        )}
                        <View style={ddStyles.optTextBox}>
                          <Text
                            style={[
                              ddStyles.optTitle,
                              isSelected && { color: opt.color || THEME.colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {opt.id}
                          </Text>
                          {opt.desc ? (
                            <Text style={ddStyles.optDesc}>{opt.desc}</Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={opt.color || THEME.colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

const ddStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  triggerDisabled: { opacity: 0.5 },
  triggerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  leftIcon: { marginRight: 10 },
  triggerText: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },
  placeholderText: { color: THEME.colors.textMuted, fontWeight: '400' },
  arrowBox: { marginLeft: 8 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorderActive,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  closeBtn: { padding: 4 },
  optionsList: { maxHeight: 340 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: THEME.radii.md,
    marginVertical: 2,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  optIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optTextBox: { flex: 1 },
  optTitle: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },
  optDesc: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 },
})

// ─── Main Sensor Gauge ────────────────────────────────────────────────────────
function SensorGauge({ icon, label, value, unit, color, statusText }) {
  return (
    <View style={[gaugeStyles.card, { borderColor: `${color}35` }]}>
      <View style={gaugeStyles.topRow}>
        <View style={[gaugeStyles.iconBox, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {statusText && (
          <View style={[gaugeStyles.badge, { backgroundColor: `${color}15` }]}>
            <Text style={[gaugeStyles.badgeText, { color }]}>{statusText}</Text>
          </View>
        )}
      </View>

      <Text style={gaugeStyles.value}>
        {value !== null && value !== undefined ? Number(value).toFixed(1) : '--'}
        <Text style={gaugeStyles.unit}> {unit}</Text>
      </Text>
      <Text style={gaugeStyles.label}>{label}</Text>
    </View>
  )
}

const gaugeStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 125,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.radii.full,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  value: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  unit: { fontSize: 14, fontWeight: '500', color: THEME.colors.textMuted },
  label: { fontSize: 12, color: THEME.colors.textMuted, fontWeight: '600' },
})

// ─── Main Dashboard Tab Component ─────────────────────────────────────────────
export function DashboardTab({ onSessionChange }) {
  // Dropdown states
  const [product, setProduct] = useState('Coconut')
  const [moisture, setMoisture] = useState('Medium Moisture')

  // Analysis state
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeErr, setAnalyzeErr] = useState('')

  // Session state
  const [activeSession, setActiveSession] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)

  // Real-time Chamber Readings (ALWAYS VISIBLE)
  // Ambient base: ~32-35°C, humidity ~55-65%
  // Drying active: ~45-55°C, humidity ~22-38%
  const [chamberTemp, setChamberTemp] = useState(33.8)
  const [chamberHumid, setChamberHumid] = useState(58.2)

  const timerRef = useRef(null)
  const sensorRef = useRef(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    sessionRef.current = activeSession
  }, [activeSession])

  // Check on mount if any running session already exists
  useEffect(() => {
    async function initCheck() {
      const res = await fetchSessions()
      if (res.success && res.data?.length > 0) {
        const running = res.data.find((s) => s.status === 'running')
        if (running) {
          setActiveSession(running)
          setProduct(running.product)
          if (running.moistureLevel) setMoisture(running.moistureLevel)
        }
      }
    }
    initCheck()
  }, [])

  // Auto-analyze model whenever product or moisture changes
  useEffect(() => {
    let isCancelled = false
    async function runAnalysis() {
      if (!product) return
      setAnalyzing(true)
      setAnalyzeErr('')
      const res = await analyzeProduct(product, moisture)
      if (!isCancelled) {
        setAnalyzing(false)
        if (res.success) {
          setAnalysis(res.data)
        } else {
          setAnalyzeErr(res.error || 'Failed to analyze product')
        }
      }
    }
    runAnalysis()
    return () => { isCancelled = true }
  }, [product, moisture])

  // Live timer tick (1s)
  useEffect(() => {
    clearInterval(timerRef.current)
    if (activeSession?.status === 'running') {
      const startMs = new Date(activeSession.startedAt).getTime()
      setElapsedMs(Math.max(0, Date.now() - startMs))
      timerRef.current = setInterval(() => {
        setElapsedMs(Math.max(0, Date.now() - startMs))
      }, 1000)
    } else {
      setElapsedMs(0)
    }
    return () => clearInterval(timerRef.current)
  }, [activeSession])

  // Continuous sensor readings update (every 3 seconds)
  // ALWAYS updates so temperature and humidity are always active on the dashboard!
  useEffect(() => {
    clearInterval(sensorRef.current)

    sensorRef.current = setInterval(async () => {
      const current = sessionRef.current
      const isRunning = current?.status === 'running'

      if (isRunning) {
        const startMs = new Date(current.startedAt).getTime()
        const elapsed = Date.now() - startMs

        // Temperature rises toward target (48°C - 55°C)
        const targetTemp = current.product === 'Chilli' ? 54 : current.product === 'Coconut' ? 50 : 46
        const riseFactor = Math.min(1, elapsed / 120000) // reaches near target in ~2 min of simulated time
        const baseT = 34 + (targetTemp - 34) * riseFactor
        const jitterT = (Math.random() * 1.6 - 0.8)
        const newTemp = Number((baseT + jitterT).toFixed(1))

        // Humidity drops as drying progresses
        const dropFactor = Math.min(0.7, (elapsed / 300000))
        const baseH = Math.max(20, 58 - dropFactor * 45)
        const jitterH = (Math.random() * 2.0 - 1.0)
        const newHumid = Number((baseH + jitterH).toFixed(1))

        setChamberTemp(newTemp)
        setChamberHumid(newHumid)

        // Record reading to session
        await addReading(current.id, newTemp, newHumid)
      } else {
        // Idle/ambient readings fluctuating gently around ambient room conditions
        setChamberTemp((prev) => {
          const delta = (Math.random() * 0.6 - 0.3)
          const next = Number(Math.max(28, Math.min(37, prev + delta)).toFixed(1))
          return next
        })
        setChamberHumid((prev) => {
          const delta = (Math.random() * 1.0 - 0.5)
          const next = Number(Math.max(48, Math.min(68, prev + delta)).toFixed(1))
          return next
        })
      }
    }, 3000)

    return () => clearInterval(sensorRef.current)
  }, [])

  // Start Drying Process
  const handleStartProcess = async () => {
    if (!product) return
    setStarting(true)
    const hours = analysis?.estimatedHours || 8
    const res = await startSession(product, moisture, hours)
    setStarting(false)

    if (res.success && res.data) {
      setActiveSession(res.data)
      setElapsedMs(0)
      if (onSessionChange) onSessionChange()
    }
  }

  // Stop Drying Process
  const handleStopProcess = async () => {
    if (!activeSession) return
    setStopping(true)
    await stopSession(activeSession.id)
    setStopping(false)

    clearInterval(timerRef.current)
    setActiveSession(null)
    setElapsedMs(0)
    if (onSessionChange) onSessionChange()
  }

  const isRunning = activeSession?.status === 'running'
  const estimatedHours = activeSession?.estimatedHours || analysis?.estimatedHours || 0
  const estimatedMs = estimatedHours * 3600000
  const remainingMs = Math.max(0, estimatedMs - elapsedMs)
  const progressPct = estimatedMs > 0 ? Math.min(100, (elapsedMs / estimatedMs) * 100) : 0

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.eyebrowRow}>
          <View style={[s.liveDot, isRunning && s.liveDotActive]} />
          <Text style={s.eyebrow}>
            {isRunning ? 'DRYING PROCESS IN PROGRESS' : 'SMART SOLAR DEHYDRATOR'}
          </Text>
        </View>
        <Text style={s.title}>DrySense Dashboard</Text>
        <Text style={s.subtitle}>
          Select product by dropdown, analyze drying time with model, control process and monitor sensors.
        </Text>
      </View>

      {/* ─── 1. Product Selection (DROPDOWN) ──────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="options-outline" size={18} color={THEME.colors.primary} />
          <Text style={s.cardTitle}>Product Selection & Model Analysis</Text>
        </View>

        {/* Product Dropdown */}
        <DropdownPicker
          label="SELECT PRODUCT BY DROPDOWN"
          placeholder="Choose product to dry..."
          options={PRODUCTS}
          value={product}
          onChange={(val) => setProduct(val)}
          disabled={isRunning}
        />

        {/* Moisture Level Dropdown */}
        <DropdownPicker
          label="MOISTURE LEVEL"
          placeholder="Select moisture content..."
          options={MOISTURE_LEVELS}
          value={moisture}
          onChange={(val) => setMoisture(val)}
          disabled={isRunning}
        />

        {/* Analysis Status / Indicator */}
        {analyzing ? (
          <View style={s.analyzingRow}>
            <ActivityIndicator size="small" color={THEME.colors.solar} />
            <Text style={s.analyzingText}>Model is analyzing drying parameters...</Text>
          </View>
        ) : analysis ? (
          <View style={s.modelPillRow}>
            <Ionicons name="sparkles" size={13} color={THEME.colors.solar} />
            <Text style={s.modelPillText}>
              Model Prediction: <Text style={{ color: THEME.colors.primary, fontWeight: '800' }}>{analysis.estimatedHours} Hours</Text> ({analysis.confidence}% confidence)
            </Text>
          </View>
        ) : null}

        {!!analyzeErr && (
          <View style={s.errRow}>
            <Ionicons name="alert-circle" size={14} color={THEME.colors.danger} />
            <Text style={s.errText}>{analyzeErr}</Text>
          </View>
        )}
      </View>

      {/* ─── 2. Start & Stop Process Controls ────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="flash-outline" size={18} color={isRunning ? THEME.colors.danger : THEME.colors.primary} />
          <Text style={s.cardTitle}>Drying Process Controls</Text>
        </View>

        <View style={s.controlButtonsRow}>
          {!isRunning ? (
            <TouchableOpacity
              style={[s.btnStart, (!product || starting) && s.btnDisabled]}
              onPress={handleStartProcess}
              disabled={!product || starting}
              activeOpacity={0.85}
            >
              {starting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={s.btnStartText}>Start Process</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btnStop, stopping && s.btnDisabled]}
              onPress={handleStopProcess}
              disabled={stopping}
              activeOpacity={0.85}
            >
              {stopping ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={s.btnStopText}>Stop Process</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.controlHint}>
          {isRunning
            ? `Drying ${activeSession?.product || product} (${activeSession?.moistureLevel || moisture}) under solar chamber.`
            : `Click Start Process to begin drying ${product || 'selected product'}.`}
        </Text>
      </View>

      {/* ─── 3. Time Display: Dried & Remaining (ALWAYS VISIBLE) ──────────── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="time-outline" size={18} color={THEME.colors.solar} />
          <Text style={s.cardTitle}>Process Timing & Progress</Text>
        </View>

        <View style={s.timersRow}>
          {/* Time Dried (Elapsed) */}
          <View style={s.timerCol}>
            <View style={s.timerHeaderBadge}>
              <Ionicons name="play-outline" size={12} color={THEME.colors.primary} />
              <Text style={s.timerLabel}>TIME DRIED</Text>
            </View>
            <Text style={s.timerValue}>{formatDuration(elapsedMs)}</Text>
            <Text style={s.timerSubLabel}>
              {isRunning ? 'Currently drying' : 'Process idle'}
            </Text>
          </View>

          <View style={s.timerDivider} />

          {/* Time Remaining */}
          <View style={s.timerCol}>
            <View style={s.timerHeaderBadge}>
              <Ionicons name="hourglass-outline" size={12} color={THEME.colors.solar} />
              <Text style={[s.timerLabel, { color: THEME.colors.solar }]}>TIME REMAIN</Text>
            </View>
            <Text style={[s.timerValue, { color: THEME.colors.solar }]}>
              {isRunning ? formatHours(remainingMs / 3600000) : `${estimatedHours}h 0m`}
            </Text>
            <Text style={s.timerSubLabel}>
              {isRunning ? `${Math.round(progressPct)}% complete` : 'Estimated duration'}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${isRunning ? Math.max(2, progressPct) : 0}%` }]} />
        </View>
        <View style={s.progressRow}>
          <Text style={s.progressMetaText}>
            Estimated total: <Text style={{ color: THEME.colors.textPrimary, fontWeight: '700' }}>{estimatedHours} hours</Text>
          </Text>
          <Text style={s.progressMetaText}>
            {isRunning ? `${Math.round(progressPct)}%` : 'Ready to start'}
          </Text>
        </View>
      </View>

      {/* ─── 4. Temperature & Humidity Readings (ALWAYS VISIBLE) ─────────── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="hardware-chip-outline" size={18} color={THEME.colors.temp} />
          <Text style={s.cardTitle}>Chamber Sensor Readings</Text>
          <View style={[s.sensorStatusBadge, isRunning ? s.badgeActive : s.badgeIdle]}>
            <View style={[s.sensorPulseDot, isRunning ? s.pulseActive : s.pulseIdle]} />
            <Text style={[s.sensorStatusText, isRunning ? s.pulseTextActive : s.pulseTextIdle]}>
              {isRunning ? 'Live Drying Readings' : 'Ambient Chamber Sensors'}
            </Text>
          </View>
        </View>

        <View style={s.gaugesContainer}>
          {/* Temperature reading */}
          <SensorGauge
            icon="thermometer-outline"
            label="Chamber Temperature"
            value={chamberTemp}
            unit="°C"
            color={THEME.colors.temp}
            statusText={isRunning ? 'Heating' : 'Ambient'}
          />

          {/* Humidity reading */}
          <SensorGauge
            icon="water-outline"
            label="Chamber Humidity"
            value={chamberHumid}
            unit="%"
            color={THEME.colors.humidity}
            statusText={isRunning ? 'Dehumidifying' : 'Ambient'}
          />
        </View>

        {analysis?.tempRange ? (
          <View style={s.sensorFooter}>
            <Ionicons name="information-circle-outline" size={14} color={THEME.colors.textMuted} />
            <Text style={s.sensorFooterText}>
              Target drying temp for {product}: <Text style={{ color: THEME.colors.primary, fontWeight: '700' }}>{analysis.tempRange}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  header: { marginBottom: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.textMuted,
  },
  liveDotActive: {
    backgroundColor: THEME.colors.primary,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1.1,
  },
  title: { fontSize: 26, fontWeight: '900', color: THEME.colors.textPrimary },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
  },

  // Model & Analysis indicators
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  analyzingText: { fontSize: 12, color: THEME.colors.solar },
  modelPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radii.md,
    marginTop: 2,
  },
  modelPillText: { fontSize: 12, color: THEME.colors.solar, fontWeight: '600' },
  errRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errText: { fontSize: 12, color: THEME.colors.danger },

  // Control buttons
  controlButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnStart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radii.md,
    paddingVertical: 14,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnStartText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnStop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.danger,
    borderRadius: THEME.radii.md,
    paddingVertical: 14,
    shadowColor: THEME.colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnStopText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.45 },
  controlHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },

  // Timers
  timersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timerCol: { flex: 1, alignItems: 'center' },
  timerHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.8,
  },
  timerValue: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  timerSubLabel: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 },
  timerDivider: {
    width: 1,
    height: 48,
    backgroundColor: THEME.colors.cardBorder,
    marginHorizontal: 8,
  },

  // Progress Bar
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressMetaText: { fontSize: 11, color: THEME.colors.textMuted },

  // Sensor Gauges
  sensorStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radii.full,
  },
  badgeActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.05)' },
  sensorPulseDot: { width: 6, height: 6, borderRadius: 3 },
  pulseActive: { backgroundColor: THEME.colors.primary },
  pulseIdle: { backgroundColor: THEME.colors.textMuted },
  sensorStatusText: { fontSize: 10, fontWeight: '700' },
  pulseTextActive: { color: THEME.colors.primary },
  pulseTextIdle: { color: THEME.colors.textMuted },
  gaugesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sensorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
  },
  sensorFooterText: { fontSize: 11, color: THEME.colors.textMuted },
})

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DetailedTelemetryChart } from './Charts'
import { THEME } from '../theme'

export function LiveMonitoringTab({
  activeCycle,
  metrics,
  onUpdateStatus,
  onAddReading,
  onSimulateReading,
  isActionLoading,
  onNavigate,
}) {
  const [isAutoSimulating, setIsAutoSimulating] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [manualTemp, setManualTemp] = useState('50.2')
  const [manualHumidity, setManualHumidity] = useState('41.0')
  const [manualMoisture, setManualMoisture] = useState('17.5')
  const [manualWeight, setManualWeight] = useState('1.23')
  const [manualMessage, setManualMessage] = useState('')

  // Sync manual defaults with active metrics
  useEffect(() => {
    if (metrics) {
      if (metrics.temperature != null)
        setManualTemp((metrics.temperature + (Math.random() * 0.4 - 0.2)).toFixed(1))
      if (metrics.humidity != null)
        setManualHumidity(Math.max(15, metrics.humidity - Math.random() * 0.8).toFixed(0))
      if (metrics.moisture != null)
        setManualMoisture(Math.max(activeCycle?.targetMoisture || 10, metrics.moisture - 0.3).toFixed(1))
      if (metrics.weight != null)
        setManualWeight(Math.max(0.5, metrics.weight - 0.01).toFixed(2))
    }
  }, [metrics, activeCycle])

  // Auto-simulation interval
  useEffect(() => {
    if (!isAutoSimulating || !activeCycle || activeCycle.status !== 'running') {
      if (isAutoSimulating && activeCycle?.status !== 'running') {
        setIsAutoSimulating(false)
      }
      return
    }

    const timer = setInterval(() => {
      onSimulateReading(activeCycle.id)
    }, 6000)

    return () => clearInterval(timer)
  }, [isAutoSimulating, activeCycle, onSimulateReading])

  if (!activeCycle) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="sunny-outline" size={40} color={THEME.colors.solar} />
        </View>
        <Text style={styles.emptyTitle}>Chamber is in Standby</Text>
        <Text style={styles.emptySub}>
          No active drying cycle is currently running in the solar dehydrator.
        </Text>
        <TouchableOpacity style={styles.btnStartNew} onPress={() => onNavigate('New Drying')}>
          <Ionicons name="add-circle" size={18} color="#ffffff" />
          <Text style={styles.btnStartNewText}>Configure New Solar Batch</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const readings = activeCycle.readings || []
  const initialWeight = activeCycle.initialWeight || 1.43
  const currentWeight = metrics.weight ?? activeCycle.currentWeight ?? initialWeight
  const waterEvaporated = Math.max(0, initialWeight - currentWeight).toFixed(2)

  const handleManualSubmit = async () => {
    setManualMessage('')
    const res = await onAddReading(activeCycle.id, {
      temperature: Number(manualTemp),
      humidity: Number(manualHumidity),
      moisture: Number(manualMoisture),
      weight: Number(manualWeight),
    })
    if (res?.success) {
      setManualMessage('Sensor reading logged successfully!')
      setTimeout(() => {
        setManualMessage('')
        setModalVisible(false)
      }, 1200)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroTopRow}>
          <View style={styles.liveTag}>
            <View style={styles.livePulse} />
            <Text style={styles.liveTagText}>LIVE TELEMETRY STREAM</Text>
          </View>
          <View style={[styles.statusBadge, styles[`status_${activeCycle.status}`]]}>
            <Text style={styles.statusBadgeText}>{activeCycle.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {activeCycle.product} · {activeCycle.productState}
        </Text>
        <Text style={styles.heroMeta}>
          ID: {activeCycle.id.slice(0, 18)} &bull; Started:{' '}
          {new Date(activeCycle.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Action Controls */}
        <View style={styles.controlRow}>
          {activeCycle.status === 'running' ? (
            <TouchableOpacity
              style={[styles.ctrlBtn, styles.ctrlPause]}
              onPress={() => onUpdateStatus(activeCycle.id, 'paused')}
              disabled={isActionLoading}
            >
              <Ionicons name="pause" size={14} color="#ffffff" />
              <Text style={styles.ctrlBtnText}>Pause</Text>
            </TouchableOpacity>
          ) : activeCycle.status === 'paused' ? (
            <TouchableOpacity
              style={[styles.ctrlBtn, styles.ctrlResume]}
              onPress={() => onUpdateStatus(activeCycle.id, 'running')}
              disabled={isActionLoading}
            >
              <Ionicons name="play" size={14} color="#ffffff" />
              <Text style={styles.ctrlBtnText}>Resume</Text>
            </TouchableOpacity>
          ) : null}

          {(activeCycle.status === 'running' || activeCycle.status === 'paused') && (
            <>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlStop]}
                onPress={() => onUpdateStatus(activeCycle.id, 'stopped')}
                disabled={isActionLoading}
              >
                <Ionicons name="stop" size={14} color={THEME.colors.danger} />
                <Text style={[styles.ctrlBtnText, { color: THEME.colors.danger }]}>Stop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlComplete]}
                onPress={() => onUpdateStatus(activeCycle.id, 'completed')}
                disabled={isActionLoading}
              >
                <Ionicons name="checkmark-done" size={14} color={THEME.colors.primary} />
                <Text style={[styles.ctrlBtnText, { color: THEME.colors.primary }]}>Complete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 4 Chamber Telemetry Cards */}
      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Chamber Temperature</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.temp }]}>
            {metrics.temperature != null ? metrics.temperature.toFixed(1) : '--'}
            <Text style={styles.metricUnit}>°C</Text>
          </Text>
          <Text style={styles.metricSub}>Glazed solar collector</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Exhaust Humidity</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.humidity }]}>
            {metrics.humidity != null ? metrics.humidity.toFixed(0) : '--'}
            <Text style={styles.metricUnit}>% RH</Text>
          </Text>
          <Text style={styles.metricSub}>Convective air removal</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Moisture Content</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
            {metrics.moisture != null ? metrics.moisture.toFixed(1) : '--'}
            <Text style={styles.metricUnit}>%</Text>
          </Text>
          <Text style={styles.metricSub}>Target: {activeCycle.targetMoisture}%</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Biomass Mass</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.weight }]}>
            {metrics.weight != null ? metrics.weight.toFixed(2) : '--'}
            <Text style={styles.metricUnit}>kg</Text>
          </Text>
          <Text style={styles.metricSub}>Loss: {waterEvaporated} kg water</Text>
        </View>
      </View>

      {/* Simulator Toolbar */}
      <View style={styles.simCard}>
        <View style={styles.simLeft}>
          <View style={styles.simToggleRow}>
            <Switch
              value={isAutoSimulating}
              onValueChange={setIsAutoSimulating}
              trackColor={{ false: '#334155', true: THEME.colors.primaryDark }}
              thumbColor={isAutoSimulating ? THEME.colors.primary : '#94a3b8'}
            />
            <Text style={styles.simToggleLabel}>
              {isAutoSimulating ? 'Continuous Solar Stream Active' : 'Auto Telemetry Stream'}
            </Text>
          </View>
        </View>

        <View style={styles.simButtonsRow}>
          <TouchableOpacity
            style={styles.simBtn}
            onPress={() => onSimulateReading(activeCycle.id)}
            disabled={isActionLoading}
          >
            <Ionicons name="flash-outline" size={14} color={THEME.colors.solar} />
            <Text style={styles.simBtnText}>Inject Pulse</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.simBtnManual} onPress={() => setModalVisible(true)}>
            <Ionicons name="pencil-outline" size={14} color={THEME.colors.textPrimary} />
            <Text style={styles.simBtnManualText}>Log Sensor Point</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detailed Telemetry Curve */}
      <Text style={styles.chartTitle}>Thermodynamic Telemetry Curve</Text>
      <DetailedTelemetryChart
        readings={readings}
        targetMoisture={activeCycle.targetMoisture}
      />

      {/* Manual Input Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Sensor Telemetry Point</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {manualMessage ? (
              <View style={styles.modalSuccessAlert}>
                <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
                <Text style={styles.modalSuccessText}>{manualMessage}</Text>
              </View>
            ) : null}

            <View style={styles.modalForm}>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Temperature (°C)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={manualTemp}
                  onChangeText={setManualTemp}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Humidity (% RH)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={manualHumidity}
                  onChangeText={setManualHumidity}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Moisture (%)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={manualMoisture}
                  onChangeText={setManualMoisture}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={manualWeight}
                  onChangeText={setManualWeight}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSubmitReading}
                onPress={handleManualSubmit}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnSubmitReadingText}>Save Reading</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: THEME.colors.bg,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 20,
  },
  btnStartNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: THEME.radii.md,
  },
  btnStartNewText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radii.full,
  },
  status_running: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  status_paused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  status_stopped: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  status_completed: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  heroMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 14,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
  },
  ctrlPause: {
    backgroundColor: '#9a3412',
    borderColor: '#c2410c',
  },
  ctrlResume: {
    backgroundColor: THEME.colors.primaryDark,
    borderColor: THEME.colors.primary,
  },
  ctrlStop: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  ctrlComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  ctrlBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  metricUnit: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  metricSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  simCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  simLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simToggleLabel: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
  },
  simBtnText: {
    color: THEME.colors.solar,
    fontSize: 11,
    fontWeight: '600',
  },
  simBtnManual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
  },
  simBtnManualText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.xl,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalSuccessAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 8,
    borderRadius: THEME.radii.sm,
    marginBottom: 12,
  },
  modalSuccessText: {
    color: THEME.colors.primaryLight,
    fontSize: 12,
  },
  modalForm: {
    gap: 12,
    marginBottom: 16,
  },
  modalField: {},
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
  },
  btnCancelText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  btnSubmitReading: {
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radii.sm,
  },
  btnSubmitReadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
})

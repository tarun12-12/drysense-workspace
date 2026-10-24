import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

export function CycleModal({ cycle, onClose, onSelectForAnalytics }) {
  if (!cycle) return null

  const startedFormatted = cycle.startedAt
    ? new Date(cycle.startedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A'

  const completedFormatted = cycle.completedAt
    ? new Date(cycle.completedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : cycle.estimatedFinishAt
    ? `Est. ${new Date(cycle.estimatedFinishAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'In progress'

  const readings = cycle.readings || []

  const exportCycleCsv = () => {
    if (!readings || readings.length === 0) {
      Alert.alert('Empty', 'No reading data available to export for this batch.')
      return
    }
    const headers = ['Timestamp', 'Temperature_C', 'Humidity_pct', 'Moisture_pct', 'Weight_kg']
    const rows = readings.map((r) => [
      new Date(r.recordedAt).toISOString(),
      r.temperature,
      r.humidity,
      r.moisture,
      r.weight,
    ])
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${cycle.product}_${cycle.id}_telemetry.csv`)
      link.click()
    } else {
      Alert.alert('CSV Ready', `Exported ${readings.length} telemetry points.`)
    }
  }

  return (
    <Modal visible={Boolean(cycle)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CYCLE TELEMETRY DOSSIER</Text>
              <Text style={styles.title}>
                {cycle.product} <Text style={styles.badge}>{cycle.productState}</Text>
              </Text>
              <Text style={styles.idText}>ID: {cycle.id}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Meta Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={[styles.metaVal, { color: THEME.colors.primary }]}>
                {cycle.status.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Moisture Drop</Text>
              <Text style={styles.metaVal}>
                {cycle.initialMoisture}% &rarr; {cycle.currentMoisture ?? cycle.targetMoisture}%
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Target Moisture</Text>
              <Text style={[styles.metaVal, { color: THEME.colors.solar }]}>
                {cycle.targetMoisture}% safe
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Biomass Mass</Text>
              <Text style={styles.metaVal}>
                {cycle.initialWeight}kg &rarr; {cycle.currentWeight}kg
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Started</Text>
              <Text style={styles.metaValSmall}>{startedFormatted}</Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Finished / ETA</Text>
              <Text style={styles.metaValSmall}>{completedFormatted}</Text>
            </View>
          </View>

          {/* Readings Section */}
          <View style={styles.readingsSection}>
            <View style={styles.readingsHeader}>
              <Text style={styles.readingsTitle}>Logged Telemetry Points ({readings.length})</Text>
              <TouchableOpacity style={styles.btnCsv} onPress={exportCycleCsv}>
                <Ionicons name="download-outline" size={12} color={THEME.colors.textPrimary} />
                <Text style={styles.btnCsvText}>Export CSV</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tableScroll}>
              {readings.length === 0 ? (
                <Text style={styles.emptyReadings}>No reading data recorded yet for this batch.</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.th, { flex: 1.2 }]}>Time</Text>
                    <Text style={styles.th}>Temp</Text>
                    <Text style={styles.th}>Humidity</Text>
                    <Text style={styles.th}>Moisture</Text>
                    <Text style={styles.th}>Weight</Text>
                  </View>

                  {readings.map((r, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 1.2 }]}>
                        {new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[styles.td, { color: THEME.colors.temp }]}>{r.temperature}°C</Text>
                      <Text style={[styles.td, { color: THEME.colors.humidity }]}>{r.humidity}%</Text>
                      <Text style={[styles.td, { color: THEME.colors.primary, fontWeight: '700' }]}>
                        {r.moisture}%
                      </Text>
                      <Text style={styles.td}>{r.weight}kg</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Footer actions */}
          <View style={styles.footer}>
            {onSelectForAnalytics && (
              <TouchableOpacity
                style={styles.btnAnalytics}
                onPress={() => {
                  onSelectForAnalytics(cycle)
                  onClose()
                }}
              >
                <Ionicons name="stats-chart" size={14} color="#ffffff" />
                <Text style={styles.btnAnalyticsText}>View in Analytics</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <Text style={styles.btnCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.xl,
    padding: 18,
    width: '100%',
    maxWidth: 580,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  eyebrow: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  idText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: THEME.radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: THEME.radii.lg,
    padding: 12,
    gap: 12,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
    minWidth: 110,
  },
  metaLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  metaValSmall: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  readingsSection: {
    flex: 1,
    marginBottom: 14,
  },
  readingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readingsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  btnCsv: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  btnCsvText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  tableScroll: {
    maxHeight: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: THEME.radii.md,
    padding: 8,
  },
  emptyReadings: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    padding: 16,
    textAlign: 'center',
  },
  table: {
    width: '100%',
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    paddingBottom: 6,
    marginBottom: 6,
  },
  th: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  td: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btnAnalytics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.md,
  },
  btnAnalyticsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnClose: {
    backgroundColor: THEME.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.md,
  },
  btnCloseText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
})

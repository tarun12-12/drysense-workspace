import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getApiBase, setApiBase, fetchHealth } from '../api'
import { THEME } from '../theme'

export function SettingsTab({ systemInfo, isOnline, onHealthCheck }) {
  const [apiUrl, setApiUrl] = useState(getApiBase())
  const [unitName, setUnitName] = useState(systemInfo?.name || 'Dryer unit 01')
  const [pollInterval, setPollInterval] = useState('3000')
  const [maxTempAlarm, setMaxTempAlarm] = useState('62')
  const [minHumidityAlarm, setMinHumidityAlarm] = useState('25')
  const [tempOffset, setTempOffset] = useState('0.0')
  const [humidOffset, setHumidOffset] = useState('0.0')
  const [weightTare, setWeightTare] = useState('0.00')
  const [savedMessage, setSavedMessage] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [pingResult, setPingResult] = useState(null)

  useEffect(() => {
    setApiUrl(getApiBase())
  }, [])

  const handleSaveApi = async () => {
    await setApiBase(apiUrl)
    setIsTesting(true)
    setPingResult(null)
    const health = await fetchHealth()
    setIsTesting(false)
    if (health?.ok) {
      setPingResult({ success: true, message: `Connected! Service: ${health.service || 'DrySense'}` })
    } else {
      setPingResult({
        success: false,
        message: `Offline (${health.error || 'Connection refused'}). App is in standalone demo mode.`,
      })
    }
    if (onHealthCheck) onHealthCheck()
  }

  const handleTare = () => {
    setWeightTare('0.00')
    setSavedMessage('Load cell tared to 0.00 kg.')
    setTimeout(() => setSavedMessage(''), 2500)
  }

  const handleSaveSettings = () => {
    setSavedMessage('Controller settings applied locally.')
    setTimeout(() => setSavedMessage(''), 2500)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SYSTEM CONFIGURATION & CALIBRATION</Text>
          <Text style={styles.title}>DrySense Unit Settings</Text>
          <Text style={styles.subtitle}>
            Hardware chassis parameters, mobile host connection, and sensor calibration.
          </Text>
        </View>

        <TouchableOpacity style={styles.healthBtn} onPress={onHealthCheck}>
          <Ionicons name="refresh" size={14} color={THEME.colors.textPrimary} />
          <Text style={styles.healthBtnText}>Check Health</Text>
        </TouchableOpacity>
      </View>

      {savedMessage ? (
        <View style={styles.alertSuccess}>
          <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
          <Text style={styles.alertSuccessText}>{savedMessage}</Text>
        </View>
      ) : null}

      {/* Card 1: Expo Go & Backend Connection */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wifi-outline" size={18} color={THEME.colors.primary} />
          <Text style={styles.cardTitle}>Backend Server Connection (Expo Go / Web)</Text>
        </View>

        <Text style={styles.cardDesc}>
          {Platform.OS === 'web'
            ? 'Web connects to http://localhost:4000/api by default.'
            : 'For Expo Go on a physical phone, replace localhost with your computer LAN IP (e.g. http://192.168.1.100:4000/api).'}
        </Text>

        <View style={styles.apiInputRow}>
          <TextInput
            style={styles.apiInput}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.x.x:4000/api"
            placeholderTextColor={THEME.colors.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.btnSaveApi}
            onPress={handleSaveApi}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnSaveApiText}>Save & Ping</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Presets */}
        <View style={styles.quickPresetsRow}>
          <TouchableOpacity
            style={styles.quickPresetChip}
            onPress={() => setApiUrl('http://localhost:4000/api')}
          >
            <Text style={styles.quickPresetText}>Localhost:4000</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickPresetChip}
            onPress={() => setApiUrl('http://10.0.2.2:4000/api')}
          >
            <Text style={styles.quickPresetText}>Android Emulator:4000</Text>
          </TouchableOpacity>
        </View>

        {pingResult && (
          <View
            style={[
              styles.pingAlert,
              pingResult.success ? styles.pingSuccess : styles.pingWarning,
            ]}
          >
            <Ionicons
              name={pingResult.success ? 'checkmark-circle' : 'information-circle'}
              size={16}
              color={pingResult.success ? THEME.colors.primary : THEME.colors.solar}
            />
            <Text
              style={[
                styles.pingText,
                { color: pingResult.success ? THEME.colors.primaryLight : THEME.colors.solar },
              ]}
            >
              {pingResult.message}
            </Text>
          </View>
        )}
      </View>

      {/* Card 2: Hardware Identification */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="hardware-chip-outline" size={18} color={THEME.colors.solar} />
          <Text style={styles.cardTitle}>Hardware Identification</Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.label}>Unit Name</Text>
            <TextInput
              style={styles.input}
              value={unitName}
              onChangeText={setUnitName}
            />
          </View>

          <View style={styles.formCol}>
            <Text style={styles.label}>Chassis Identifier</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={systemInfo?.id || 'dryer-unit-01'}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.label}>Solar Collector Type</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value="Glazed Flat-Plate Collector"
              editable={false}
            />
          </View>

          <View style={styles.formCol}>
            <Text style={styles.label}>Chamber Usable Volume</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value="0.45 m³ (Dual perforated trays)"
              editable={false}
            />
          </View>
        </View>
      </View>

      {/* Card 3: Telemetry Streaming & Safety Alarms */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.humidity} />
          <Text style={styles.cardTitle}>Sampling Rate & Thermal Safety Alarms</Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.label}>Polling Interval</Text>
            <View style={styles.chipsRow}>
              {['2000', '3500', '5000', '10000'].map((ms) => (
                <TouchableOpacity
                  key={ms}
                  style={[styles.rateChip, pollInterval === ms && styles.rateChipActive]}
                  onPress={() => setPollInterval(ms)}
                >
                  <Text style={[styles.rateChipText, pollInterval === ms && styles.rateChipTextActive]}>
                    {Number(ms) / 1000}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.label}>High Temp Cutoff (°C)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={maxTempAlarm}
              onChangeText={setMaxTempAlarm}
            />
            <Text style={styles.hint}>Safety exhaust trigger</Text>
          </View>

          <View style={styles.formCol}>
            <Text style={styles.label}>Min Humidity Alert (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={minHumidityAlarm}
              onChangeText={setMinHumidityAlarm}
            />
            <Text style={styles.hint}>Over-drying threshold</Text>
          </View>
        </View>
      </View>

      {/* Card 4: Sensor Calibration & Load Cell Tare */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="construct-outline" size={18} color={THEME.colors.weight} />
          <Text style={styles.cardTitle}>Sensor Offsets & Load Cell Calibration</Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.label}>Temperature Offset (°C)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempOffset}
              onChangeText={setTempOffset}
            />
          </View>

          <View style={styles.formCol}>
            <Text style={styles.label}>Humidity Offset (% RH)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={humidOffset}
              onChangeText={setHumidOffset}
            />
          </View>
        </View>

        <View style={styles.tareRow}>
          <View>
            <Text style={styles.label}>Load Cell Tare</Text>
            <Text style={styles.hint}>Zero tare biomass weighing platform</Text>
          </View>
          <TouchableOpacity style={styles.btnTare} onPress={handleTare}>
            <Ionicons name="scale-outline" size={14} color="#ffffff" />
            <Text style={styles.btnTareText}>Tare (0.00 kg)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.btnApplyAll} onPress={handleSaveSettings}>
        <Text style={styles.btnApplyAllText}>Save All Local Controller Settings</Text>
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  eyebrow: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  healthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.md,
  },
  healthBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: THEME.radii.md,
    padding: 12,
    marginBottom: 16,
  },
  alertSuccessText: {
    color: THEME.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 12,
  },
  apiInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  apiInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radii.md,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  btnSaveApi: {
    backgroundColor: THEME.colors.primaryDark,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSaveApiText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  quickPresetText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  pingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: THEME.radii.md,
  },
  pingSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pingWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
    minWidth: 130,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radii.md,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  rateChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.primary,
  },
  rateChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  rateChipTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  tareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  btnTare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.md,
  },
  btnTareText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnApplyAll: {
    backgroundColor: THEME.colors.cardBorder,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorderActive,
    borderRadius: THEME.radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnApplyAllText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
})

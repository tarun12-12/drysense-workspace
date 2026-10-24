import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

const PRODUCT_PRESETS = {
  Mango: { state: 'Sliced', initMoist: 32, targetMoist: 12, weight: 1.45, temp: 50, timeEst: '4h 15m' },
  Banana: { state: 'Ripe', initMoist: 38, targetMoist: 14, weight: 1.6, temp: 48, timeEst: '5h 00m' },
  Turmeric: { state: 'Whole', initMoist: 26, targetMoist: 10, weight: 2.0, temp: 52, timeEst: '6h 30m' },
  Groundnut: { state: 'Cleaned', initMoist: 22, targetMoist: 8, weight: 2.5, temp: 46, timeEst: '3h 45m' },
  Rice: { state: 'Cleaned', initMoist: 24, targetMoist: 13, weight: 3.0, temp: 45, timeEst: '3h 30m' },
  Wheat: { state: 'Cleaned', initMoist: 20, targetMoist: 12, weight: 3.0, temp: 45, timeEst: '3h 00m' },
}

export function NewDryingTab({ options, onStartCycle, isActionLoading, onNavigate }) {
  const products = options?.products || Object.keys(PRODUCT_PRESETS)
  const productStates = options?.productStates || ['Sliced', 'Ripe', 'Unripe', 'Whole', 'Cleaned']

  const [selectedProduct, setSelectedProduct] = useState('Mango')
  const [selectedState, setSelectedState] = useState('Sliced')
  const [initialMoisture, setInitialMoisture] = useState('32')
  const [targetMoisture, setTargetMoisture] = useState('12')
  const [initialWeight, setInitialWeight] = useState('1.45')
  const [collectorTemp, setCollectorTemp] = useState(50)
  const [airflowMode, setAirflowMode] = useState('Exhaust Fan')
  const [errorMessage, setErrorMessage] = useState('')

  const handleProductPreset = (prodName) => {
    setSelectedProduct(prodName)
    const preset = PRODUCT_PRESETS[prodName]
    if (preset) {
      setSelectedState(preset.state)
      setInitialMoisture(String(preset.initMoist))
      setTargetMoisture(String(preset.targetMoist))
      setInitialWeight(String(preset.weight))
      setCollectorTemp(preset.temp)
    }
  }

  const initM = Number(initialMoisture)
  const targetM = Number(targetMoisture)
  const initW = Number(initialWeight)

  const isValid = initM > targetM && initW > 0 && targetM > 0

  const waterLossKg = isValid
    ? Math.max(0, initW * ((initM - targetM) / (100 - targetM))).toFixed(2)
    : '0.00'
  const finalEstWeightKg = isValid ? Math.max(0, initW - Number(waterLossKg)).toFixed(2) : '0.00'

  const handleSubmit = () => {
    if (!isValid) {
      setErrorMessage('Initial moisture must be greater than target moisture, and weight must be positive.')
      return
    }
    setErrorMessage('')
    onStartCycle({
      product: selectedProduct,
      productState: selectedState,
      initialMoisture: initM,
      targetMoisture: targetM,
      initialWeight: initW,
      collectorTemp,
      airflowMode,
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CYCLE CONFIGURATION WIZARD</Text>
        <Text style={styles.title}>Configure New Solar Drying Batch</Text>
        <Text style={styles.subtitle}>
          Define biomass moisture properties and solar chamber parameters.
        </Text>
      </View>

      {/* Preset Pills */}
      <View style={styles.presetSection}>
        <Text style={styles.sectionLabel}>Agricultural Presets:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {products.map((p) => {
            const isSelected = selectedProduct === p
            return (
              <TouchableOpacity
                key={p}
                style={[styles.presetPill, isSelected && styles.presetPillActive]}
                onPress={() => handleProductPreset(p)}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>{p}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Form Card 1: Biomass Properties */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="leaf-outline" size={18} color={THEME.colors.primary} />
          <Text style={styles.cardTitle}>1. Biomass & Moisture Parameters</Text>
        </View>

        {/* Product Type & Processing State */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Product Type</Text>
            <View style={styles.chipsRow}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.smallChip, selectedProduct === p && styles.smallChipActive]}
                  onPress={() => handleProductPreset(p)}
                >
                  <Text style={[styles.smallChipText, selectedProduct === p && styles.smallChipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Processing State</Text>
            <View style={styles.chipsRow}>
              {productStates.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.smallChip, selectedState === s && styles.smallChipActive]}
                  onPress={() => setSelectedState(s)}
                >
                  <Text style={[styles.smallChipText, selectedState === s && styles.smallChipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Initial Moisture, Target Moisture, Weight */}
        <View style={styles.formGrid}>
          <View style={styles.formCol}>
            <Text style={styles.inputLabel}>Initial Moisture (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={initialMoisture}
              onChangeText={setInitialMoisture}
            />
            <Text style={styles.hint}>Fresh harvest: 20% - 40%</Text>
          </View>

          <View style={styles.formCol}>
            <Text style={styles.inputLabel}>Target Safe Moisture (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetMoisture}
              onChangeText={setTargetMoisture}
            />
            <Text style={styles.hint}>Safe storage: 8% - 14%</Text>
          </View>

          <View style={styles.formCol}>
            <Text style={styles.inputLabel}>Fresh Batch Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={initialWeight}
              onChangeText={setInitialWeight}
            />
            <Text style={styles.hint}>Chamber tray load</Text>
          </View>
        </View>
      </View>

      {/* Form Card 2: Solar Chamber Dynamics */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="sunny-outline" size={18} color={THEME.colors.solar} />
          <Text style={styles.cardTitle}>2. Solar Thermal Dynamics</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Collector Air Temperature Setpoint (°C)</Text>
            <View style={styles.chipsRow}>
              {[45, 48, 50, 52, 55].map((temp) => (
                <TouchableOpacity
                  key={temp}
                  style={[styles.tempChip, collectorTemp === temp && styles.tempChipActive]}
                  onPress={() => setCollectorTemp(temp)}
                >
                  <Text style={[styles.tempChipText, collectorTemp === temp && styles.tempChipTextActive]}>
                    {temp}°C
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Forced Convection Mode</Text>
            <View style={styles.chipsRow}>
              {['Exhaust Fan', 'Natural Convection', 'Turbo Auxiliary'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.smallChip, airflowMode === m && styles.smallChipActive]}
                  onPress={() => setAirflowMode(m)}
                >
                  <Text style={[styles.smallChipText, airflowMode === m && styles.smallChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Pre-flight Mass Transfer Calculation */}
      <View style={styles.calcCard}>
        <View style={styles.calcHeader}>
          <Ionicons name="calculator-outline" size={18} color={THEME.colors.primaryLight} />
          <Text style={styles.calcTitle}>Batch Thermodynamic Projection</Text>
        </View>

        <View style={styles.calcGrid}>
          <View style={styles.calcItem}>
            <Text style={styles.calcItemLabel}>Water to Evaporate</Text>
            <Text style={[styles.calcItemValue, { color: THEME.colors.humidity }]}>
              {waterLossKg} kg
            </Text>
          </View>
          <View style={styles.calcItem}>
            <Text style={styles.calcItemLabel}>Expected Dry Biomass</Text>
            <Text style={[styles.calcItemValue, { color: THEME.colors.weight }]}>
              {finalEstWeightKg} kg
            </Text>
          </View>
          <View style={styles.calcItem}>
            <Text style={styles.calcItemLabel}>Est. Solar Duration</Text>
            <Text style={[styles.calcItemValue, { color: THEME.colors.solar }]}>
              {PRODUCT_PRESETS[selectedProduct]?.timeEst || '4h 00m'}
            </Text>
          </View>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={THEME.colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={isActionLoading}
      >
        {isActionLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="play-circle" size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              Start Solar Dehydration Batch ({selectedProduct})
            </Text>
          </>
        )}
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
    marginBottom: 16,
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
  presetSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radii.full,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginRight: 8,
  },
  presetPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.primary,
  },
  presetText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  presetTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
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
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  row: {
    marginBottom: 14,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  smallChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.primary,
  },
  smallChipText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  smallChipTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  tempChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  tempChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: THEME.colors.solar,
  },
  tempChipText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  tempChipTextActive: {
    color: THEME.colors.solar,
    fontWeight: '700',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formCol: {
    flex: 1,
    minWidth: 120,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radii.md,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  calcCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: THEME.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  calcTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  calcGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  calcItem: {
    minWidth: 90,
  },
  calcItemLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  calcItemValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: THEME.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: THEME.colors.primaryDark,
    borderRadius: THEME.radii.md,
    paddingVertical: 14,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
})

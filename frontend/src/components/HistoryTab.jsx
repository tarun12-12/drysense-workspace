import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'
import { fetchSessions } from '../api'

function pad(n) { return String(n).padStart(2, '0') }

function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0h 0m'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatDate(iso) {
  if (!iso) return '--'
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function StatusBadge({ status }) {
  const map = {
    running:   { label: 'Running',   bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: THEME.colors.primary },
    stopped:   { label: 'Stopped',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
    completed: { label: 'Completed', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)', color: '#60a5fa' },
  }
  const s = map[status] || map.stopped
  return (
    <View style={[bdgStyles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[bdgStyles.text, { color: s.color }]}>{s.label}</Text>
    </View>
  )
}

const bdgStyles = StyleSheet.create({
  badge: { borderRadius: THEME.radii.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
})

function ProductIcon({ product }) {
  const icons = {
    Coconut: 'nutrition-outline',
    Chilli: 'flame-outline',
    Dhaal: 'leaf-outline',
    Mango: 'sunny-outline',
    Turmeric: 'color-filter-outline',
  }
  const colors = {
    Coconut: THEME.colors.solar,
    Chilli: THEME.colors.temp,
    Dhaal: THEME.colors.primary,
    Mango: '#f97316',
    Turmeric: '#eab308',
  }
  return (
    <View style={[piStyles.box, { backgroundColor: `${colors[product] || THEME.colors.primary}15` }]}>
      <Ionicons name={icons[product] || 'leaf-outline'} size={20} color={colors[product] || THEME.colors.primary} />
    </View>
  )
}

const piStyles = StyleSheet.create({
  box: { width: 44, height: 44, borderRadius: THEME.radii.md, alignItems: 'center', justifyContent: 'center' },
})

function SessionCard({ session }) {
  const elapsedMin = Math.floor(session.elapsedMs / 60000)
  const elapsedHours = session.elapsedMs / 3600000
  const accuracyPct = session.estimatedHours > 0 && session.status !== 'running'
    ? Math.round(100 - Math.abs(elapsedHours - session.estimatedHours) / session.estimatedHours * 100)
    : null

  return (
    <View style={scStyles.card}>
      <View style={scStyles.row}>
        <ProductIcon product={session.product} />
        <View style={scStyles.info}>
          <View style={scStyles.titleRow}>
            <Text style={scStyles.product}>{session.product}</Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={scStyles.moisture}>{session.moistureLevel}</Text>
        </View>
      </View>

      <View style={scStyles.divider} />

      <View style={scStyles.statsRow}>
        <View style={scStyles.stat}>
          <Ionicons name="time-outline" size={12} color={THEME.colors.textMuted} />
          <Text style={scStyles.statLabel}>Estimated</Text>
          <Text style={scStyles.statValue}>{session.estimatedHours}h</Text>
        </View>
        <View style={scStyles.stat}>
          <Ionicons name="hourglass-outline" size={12} color={THEME.colors.textMuted} />
          <Text style={scStyles.statLabel}>Actual</Text>
          <Text style={scStyles.statValue}>
            {session.status === 'running' ? 'In progress' : formatDurationMs(session.elapsedMs)}
          </Text>
        </View>
        <View style={scStyles.stat}>
          <Ionicons name="pulse-outline" size={12} color={THEME.colors.textMuted} />
          <Text style={scStyles.statLabel}>Readings</Text>
          <Text style={scStyles.statValue}>{session.readingCount}</Text>
        </View>
        {accuracyPct !== null && (
          <View style={scStyles.stat}>
            <Ionicons name="checkmark-circle-outline" size={12} color={accuracyPct >= 80 ? THEME.colors.primary : THEME.colors.solar} />
            <Text style={scStyles.statLabel}>Accuracy</Text>
            <Text style={[scStyles.statValue, { color: accuracyPct >= 80 ? THEME.colors.primary : THEME.colors.solar }]}>
              {Math.max(0, accuracyPct)}%
            </Text>
          </View>
        )}
      </View>

      <View style={scStyles.footer}>
        <Ionicons name="calendar-outline" size={11} color={THEME.colors.textMuted} />
        <Text style={scStyles.footerText}>{formatDate(session.startedAt)}</Text>
        {session.stoppedAt && (
          <>
            <Text style={scStyles.footerSep}>→</Text>
            <Text style={scStyles.footerText}>{formatDate(session.stoppedAt)}</Text>
          </>
        )}
      </View>
    </View>
  )
}

const scStyles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card, borderRadius: THEME.radii.lg,
    borderWidth: 1, borderColor: THEME.colors.cardBorder, padding: 16, marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  product: { fontSize: 16, fontWeight: '800', color: THEME.colors.textPrimary },
  moisture: { fontSize: 12, color: THEME.colors.textMuted },
  divider: { height: 1, backgroundColor: THEME.colors.cardBorder, marginBottom: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  stat: { flex: 1, minWidth: 70, gap: 3 },
  statLabel: { fontSize: 9, fontWeight: '700', color: THEME.colors.textMuted, letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '800', color: THEME.colors.textPrimary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 10, color: THEME.colors.textMuted },
  footerSep: { fontSize: 10, color: THEME.colors.textMuted },
})

export function HistoryTab({ refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const res = await fetchSessions()
    if (res.success) setSessions(res.data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const completed = sessions.filter((s) => s.status !== 'running')
  const running = sessions.filter((s) => s.status === 'running')

  const totalHours = completed.reduce((acc, s) => acc + s.elapsedMs / 3600000, 0)
  const products = [...new Set(sessions.map((s) => s.product))]

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={THEME.colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DRYING HISTORY</Text>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>All previous and ongoing drying sessions.</Text>
      </View>

      {/* Stats row */}
      {sessions.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completed.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: THEME.colors.primary }]}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Total Dry Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{products.length}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={52} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySubtitle}>Completed drying sessions will appear here.</Text>
        </View>
      ) : (
        <>
          {running.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active Session</Text>
              {running.map((s) => <SessionCard key={s.id} session={s} />)}
            </>
          )}

          {completed.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Completed Sessions</Text>
              {completed.map((s) => <SessionCard key={s.id} session={s} />)}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  content: { padding: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: THEME.colors.primary, letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: THEME.colors.textPrimary },
  subtitle: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: 70, backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.md, borderWidth: 1,
    borderColor: THEME.colors.cardBorder, padding: 12, alignItems: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '900', color: THEME.colors.textPrimary },
  statLabel: { fontSize: 9, color: THEME.colors.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  loadingBox: { alignItems: 'center', padding: 40 },
  loadingText: { color: THEME.colors.textMuted },
  emptyState: { alignItems: 'center', padding: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textSecondary },
  emptySubtitle: { fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: THEME.colors.textSecondary, letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
})

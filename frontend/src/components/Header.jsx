import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

export function Header({
  activePage,
  isOnline,
  onRefresh,
  isRefreshing,
  activeCycle,
  user,
  onLogout,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.logoBadge}>
          <Ionicons name="sunny" size={20} color={THEME.colors.solar} />
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>DrySense</Text>
            <View style={[styles.statusTag, isOnline ? styles.onlineTag : styles.offlineTag]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? THEME.colors.success : THEME.colors.solar }]} />
              <Text style={styles.statusText}>
                {isOnline ? 'Online' : 'Demo Mode'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Solar Dehydrator Telemetry</Text>
        </View>
      </View>

      <View style={styles.right}>
        {activeCycle?.status === 'running' && (
          <View style={styles.liveCycleIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveCycleText}>{activeCycle.product}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={THEME.colors.textSecondary} />
          )}
        </TouchableOpacity>

        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userInitial}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}

        {onLogout && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
            activeOpacity={0.7}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={18} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: THEME.radii.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radii.full,
    gap: 4,
  },
  onlineTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  offlineTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveCycleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  liveCycleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: THEME.radii.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadge: {
    width: 32,
    height: 32,
    borderRadius: THEME.radii.full,
    backgroundColor: THEME.colors.primaryDark,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: THEME.radii.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

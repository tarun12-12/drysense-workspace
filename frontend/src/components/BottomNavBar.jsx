import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

const TABS = [
  { id: 'Dashboard',  label: 'Dashboard',  icon: 'home-outline',       activeIcon: 'home'        },
  { id: 'Analytics',  label: 'Analytics',  icon: 'bar-chart-outline',  activeIcon: 'bar-chart'   },
  { id: 'History',    label: 'History',    icon: 'time-outline',       activeIcon: 'time'        },
]

export function BottomNavBar({ activePage, setActivePage, hasActiveSession }) {
  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = activePage === tab.id
        const showBadge = tab.id === 'Dashboard' && hasActiveSession
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActivePage(tab.id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? THEME.colors.primary : THEME.colors.textMuted}
              />
              {showBadge && <View style={styles.badge} />}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.navBg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.navBorder,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: THEME.radii.md,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  tabActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -2, right: -4,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: THEME.colors.primary,
    borderWidth: 1.5, borderColor: THEME.colors.bgSecondary,
  },
  label: { fontSize: 10, fontWeight: '500', color: THEME.colors.textMuted, marginTop: 3 },
  labelActive: { color: THEME.colors.primary, fontWeight: '700' },
})

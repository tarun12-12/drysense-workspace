import React, { useState, useEffect } from 'react'
import {
  View, StyleSheet, StatusBar, SafeAreaView, Platform,
} from 'react-native'
import { initApiBase, getCurrentUser, logoutUser } from './api'
import { THEME } from './theme'
import { Header } from './components/Header'
import { BottomNavBar } from './components/BottomNavBar'
import { DashboardTab } from './components/DashboardTab'
import { SensorsTab } from './components/SensorsTab'
import { AnalyticsTab } from './components/AnalyticsTab'
import { HistoryTab } from './components/HistoryTab'
import { Toast } from './components/Toast'
import { LoginScreen } from './components/LoginScreen'
import { SignupScreen } from './components/SignupScreen'

export default function App() {
  // Auth
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authScreen, setAuthScreen] = useState('login')

  // App state
  const [activePage, setActivePage] = useState('Dashboard')
  const [toast, setToast] = useState(null)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3800)
  }

  // Check persisted session on startup
  useEffect(() => {
    async function checkAuth() {
      await initApiBase()
      const saved = await getCurrentUser()
      setAuthUser(saved || false)
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    setAuthUser(false)
    setActivePage('Dashboard')
    setAuthScreen('login')
    setHasActiveSession(false)
  }

  const handleSessionChange = () => {
    setHistoryRefreshKey((k) => k + 1)
  }

  // Auth loading — blank splash
  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
      </SafeAreaView>
    )
  }

  // Not authenticated — show login/signup
  if (!authUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
        {authScreen === 'login' ? (
          <LoginScreen
            onLoginSuccess={(user) => setAuthUser(user)}
            onGoToSignup={() => setAuthScreen('signup')}
          />
        ) : (
          <SignupScreen
            onSignupSuccess={(user) => setAuthUser(user)}
            onGoToLogin={() => setAuthScreen('login')}
          />
        )}
      </SafeAreaView>
    )
  }

  // Main app
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bgSecondary} />
      <Toast toast={toast} />

      <Header
        activePage={activePage}
        isOnline={true}
        onRefresh={() => setHistoryRefreshKey((k) => k + 1)}
        isRefreshing={false}
        activeCycle={hasActiveSession ? { status: 'running' } : null}
        user={authUser}
        onLogout={handleLogout}
      />

      <View style={styles.content}>
        {activePage === 'Dashboard' && (
          <DashboardTab
            onSessionChange={handleSessionChange}
          />
        )}
        {activePage === 'Sensors' && (
          <SensorsTab refreshKey={historyRefreshKey} />
        )}
        {activePage === 'Analytics' && (
          <AnalyticsTab />
        )}
        {activePage === 'History' && (
          <HistoryTab refreshKey={historyRefreshKey} />
        )}
      </View>

      <BottomNavBar
        activePage={activePage}
        setActivePage={setActivePage}
        hasActiveSession={hasActiveSession}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
})

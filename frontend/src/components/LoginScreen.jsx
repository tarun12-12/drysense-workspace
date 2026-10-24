import React, { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { THEME } from "../theme"
import { loginUser } from "../api"

export function LoginScreen({ onLoginSuccess, onGoToSignup }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const handleLogin = async () => {
    setError("")
    if (!email.trim()) { setError("Please enter your email address."); return }
    if (!password) { setError("Please enter your password."); return }
    setIsLoading(true)
    try {
      const res = await loginUser(email.trim().toLowerCase(), password)
      if (res.success) {
        onLoginSuccess(res.user)
      } else {
        setError(res.error || "Invalid email or password.")
      }
    } catch (err) {
      setError("Connection failed. Please check your network.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <View style={styles.logoBadge}>
            <Ionicons name="sunny" size={36} color={THEME.colors.solar} />
          </View>
          <Text style={styles.brandName}>DrySense</Text>
          <Text style={styles.brandTagline}>Solar Dehydrator Telemetry</Text>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Sign in to continue</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to monitor your solar drying cycles.</Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={THEME.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="mail-outline" size={16}
                color={emailFocused ? THEME.colors.primary : THEME.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@example.com"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="lock-closed-outline" size={16}
                color={passwordFocused ? THEME.colors.primary : THEME.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Your password"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={17} color="#fff" />
                <Text style={styles.btnPrimaryText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.demoHint}>
            <Ionicons name="information-circle-outline" size={13} color={THEME.colors.textMuted} />
            <Text style={styles.demoHintText}>
              {"Demo: "}
              <Text style={styles.demoHintValue}>admin@drysense.io</Text>
              {" / "}
              <Text style={styles.demoHintValue}>drysense123</Text>
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={onGoToSignup} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.versionText}>DrySense v1.0 - Secure Auth</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: THEME.colors.bg },
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  content: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingVertical: 48,
  },
  brandSection: { alignItems: "center", marginBottom: 28, width: "100%", maxWidth: 420 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1.5, borderColor: "rgba(245, 158, 11, 0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  brandName: { fontSize: 30, fontWeight: "900", color: THEME.colors.textPrimary, letterSpacing: 0.5 },
  brandTagline: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 4, letterSpacing: 0.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, width: "100%" },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.colors.cardBorder },
  dividerText: { fontSize: 11, color: THEME.colors.textMuted, fontWeight: "500" },
  card: {
    width: "100%", maxWidth: 420, backgroundColor: THEME.colors.card,
    borderRadius: THEME.radii.xl, borderWidth: 1, borderColor: THEME.colors.cardBorder,
    padding: 24, marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: THEME.colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: THEME.colors.textMuted, marginBottom: 20 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)", borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)", borderRadius: THEME.radii.md,
    padding: 10, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 12, color: "#fca5a5", fontWeight: "500" },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: THEME.colors.textSecondary,
    marginBottom: 6, letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1.5,
    borderColor: THEME.colors.cardBorder, borderRadius: THEME.radii.md,
    paddingHorizontal: 12, minHeight: 46,
  },
  inputWrapFocused: { borderColor: THEME.colors.primary, backgroundColor: "rgba(16, 185, 129, 0.04)" },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: THEME.colors.textPrimary, fontSize: 14, paddingVertical: 10 },
  eyeBtn: { padding: 4, marginLeft: 4 },
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: THEME.colors.primary, borderRadius: THEME.radii.md,
    paddingVertical: 14, marginTop: 6, marginBottom: 14,
  },
  btnDisabled: { opacity: 0.65 },
  btnPrimaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  demoHint: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: THEME.radii.sm, padding: 8,
  },
  demoHintText: { fontSize: 11, color: THEME.colors.textMuted },
  demoHintValue: { color: THEME.colors.primaryLight, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  footerText: { fontSize: 13, color: THEME.colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: "700", color: THEME.colors.primary },
  versionBadge: { flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.5 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: THEME.colors.primary },
  versionText: { fontSize: 10, color: THEME.colors.textMuted },
})

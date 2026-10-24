import React, { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { THEME } from "../theme"
import { signupUser } from "../api"

export function SignupScreen({ onSignupSuccess, onGoToLogin }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)

  const handleSignup = async () => {
    setError("")
    if (!name.trim()) { setError("Please enter your name."); return }
    if (!email.trim()) { setError("Please enter your email address."); return }
    if (!email.includes("@")) { setError("Please enter a valid email address."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    setIsLoading(true)
    try {
      const res = await signupUser(name.trim(), email.trim().toLowerCase(), password)
      if (res.success) {
        onSignupSuccess(res.user)
      } else {
        setError(res.error || "Failed to create account. Please try again.")
      }
    } catch (err) {
      setError("Connection failed. Please check your network.")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = password.length === 0 ? null : password.length < 6 ? "weak" : password.length < 10 ? "good" : "strong"
  const strengthColor = { weak: THEME.colors.danger, good: THEME.colors.solar, strong: THEME.colors.primary }
  const strengthLabel = { weak: "Weak", good: "Good", strong: "Strong" }

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
            <Ionicons name="leaf" size={32} color={THEME.colors.primary} />
          </View>
          <Text style={styles.brandName}>DrySense</Text>
          <Text style={styles.brandTagline}>Create your account</Text>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New operator registration</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get started</Text>
          <Text style={styles.cardSubtitle}>Register to manage your DrySense dehydrator units.</Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={THEME.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="person-outline" size={16}
                color={nameFocused ? THEME.colors.primary : THEME.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Your full name"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

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
                placeholder="Min. 6 characters"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
            {passwordStrength && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBars}>
                  {["weak","good","strong"].map((level, i) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: (
                          (passwordStrength === "weak" && i === 0) ||
                          (passwordStrength === "good" && i <= 1) ||
                          passwordStrength === "strong"
                        ) ? strengthColor[passwordStrength] : THEME.colors.cardBorder }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor[passwordStrength] }]}>
                  {strengthLabel[passwordStrength]}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <View style={[styles.inputWrap, confirmFocused && styles.inputWrapFocused,
              confirmPassword && password !== confirmPassword && styles.inputWrapError]}>
              <Ionicons
                name="shield-checkmark-outline" size={16}
                color={confirmFocused ? THEME.colors.primary : THEME.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                placeholder="Re-enter password"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={16} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.matchError}>Passwords do not match</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={17} color="#fff" />
                <Text style={styles.btnPrimaryText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.termsNote}>
            <Ionicons name="lock-closed-outline" size={12} color={THEME.colors.textMuted} />
            <Text style={styles.termsText}>
              Your data is stored securely on your own backend server.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
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
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1.5, borderColor: "rgba(16, 185, 129, 0.35)",
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
  inputWrapError: { borderColor: THEME.colors.danger, backgroundColor: "rgba(239, 68, 68, 0.04)" },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: THEME.colors.textPrimary, fontSize: 14, paddingVertical: 10 },
  eyeBtn: { padding: 4, marginLeft: 4 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  strengthBars: { flexDirection: "row", gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 10, fontWeight: "700" },
  matchError: { fontSize: 11, color: THEME.colors.danger, marginTop: 4 },
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: THEME.colors.primary, borderRadius: THEME.radii.md,
    paddingVertical: 14, marginTop: 6, marginBottom: 14,
  },
  btnDisabled: { opacity: 0.65 },
  btnPrimaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  termsNote: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: THEME.radii.sm, padding: 8,
  },
  termsText: { flex: 1, fontSize: 11, color: THEME.colors.textMuted },
  footer: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  footerText: { fontSize: 13, color: THEME.colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: "700", color: THEME.colors.primary },
})

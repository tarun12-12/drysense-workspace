import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

export function Toast({ toast }) {
  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <View style={[styles.toastContainer, isError ? styles.errorToast : styles.successToast]}>
      <Ionicons
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={18}
        color={isError ? THEME.colors.danger : THEME.colors.primary}
      />
      <Text style={styles.toastText}>{toast.message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successToast: {
    backgroundColor: '#0f291e',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  errorToast: {
    backgroundColor: '#2e1214',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  toastText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
})

/**
 * LoginScreen.tsx
 * Shown when the user is not authenticated.
 * Supports both Login and Register modes with a toggle.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login, register } from '@/services/authService';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const isDark = useColorScheme() === 'dark';
  const c      = isDark ? DARK : LIGHT;

  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit() {
    setError('');

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Name is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result =
      mode === 'login'
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onLogin();
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>

          {/* ── Logo / Title ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>₹</Text>
            </View>
            <Text style={[styles.appName, { color: c.text }]}>Finance Tracker</Text>
            <Text style={[styles.subtitle, { color: c.sub }]}>
              {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </Text>
          </View>

          {/* ── Form card ──────────────────────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: c.card }]}>

            {mode === 'register' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: c.sub }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={c.placeholder}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.sub }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="john@example.com"
                placeholderTextColor={c.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.sub }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor={c.placeholder}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {/* Error message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Toggle mode ────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.toggleRow} onPress={toggleMode}>
            <Text style={[styles.toggleText, { color: c.sub }]}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const LIGHT = {
  bg: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', sub: '#64748B',
  border: '#E2E8F0', inputBg: '#F1F5F9', placeholder: '#94A3B8',
};
const DARK = {
  bg: '#0F172A', card: '#1E293B', text: '#F1F5F9', sub: '#94A3B8',
  border: '#334155', inputBg: '#0F172A', placeholder: '#475569',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },

  header:     { alignItems: 'center', gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  logoText:   { fontSize: 32, color: '#fff', fontWeight: '800' },
  appName:    { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:   { fontSize: 14 },

  card:       { borderRadius: 20, padding: 20, gap: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },

  fieldGroup: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600' },
  input:      { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 15 },

  errorBox:  { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10 },
  errorText: { color: '#991B1B', fontSize: 13, fontWeight: '500' },

  submitBtn:         { backgroundColor: '#3B82F6', borderRadius: 12, padding: 15, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  toggleRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
});

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { login, setSignupRole } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'founder' | 'investor'>('founder');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/signup`,
        { full_name: fullName, email, password, role },
        { headers: { 'X-Client': 'mobile' } },
      );
      setSignupRole(role);
      await login({ email, password });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Sign up failed. Please try again.';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role picker */}
        <Text style={styles.sectionLabel}>I am a</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'founder' && styles.roleBtnActive]}
            onPress={() => setRole('founder')}
            activeOpacity={0.7}
          >
            <Ionicons name="rocket-outline" size={20} color={role === 'founder' ? '#fff' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.roleBtnText, role === 'founder' && styles.roleBtnTextActive]}>Founder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'investor' && styles.roleBtnActive]}
            onPress={() => setRole('investor')}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={20} color={role === 'investor' ? '#fff' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.roleBtnText, role === 'investor' && styles.roleBtnTextActive]}>Investor</Text>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jane Doe"
          placeholderTextColor="rgba(255,255,255,0.2)"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="rgba(255,255,255,0.2)"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="rgba(255,255,255,0.2)"
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Creating account...' : 'Create account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0d0e1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  content: { padding: 24 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  roleBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  roleBtnTextActive: { color: '#fff' },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 8,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  linkBold: { fontWeight: '700', color: '#fbbf24' },
});

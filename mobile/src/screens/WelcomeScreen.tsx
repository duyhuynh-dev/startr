import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import type { TokenResponse, UserResponse } from '../api/auth';
import axios from 'axios';

type OAuthProvider = 'google' | 'linkedin';

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { loginWithTokens } = useAuth();
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const startOAuth = useCallback(async (provider: OAuthProvider) => {
    setOauthError(null);
    setLoading(true);
    try {
      const redirectUri = `${API_BASE_URL}/auth/oauth/${provider}/callback`;
      const res = await axios.get<{ authorization_url: string; state: string }>(
        `${API_BASE_URL}/auth/oauth/${provider}/authorize`,
        { params: { redirect_uri: redirectUri }, headers: { 'X-Client': 'mobile' } },
      );
      setOauthProvider(provider);
      setOauthState(res.data.state);
      setOauthUrl(res.data.authorization_url);
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        'Could not start sign-in. Check that the server is running and OAuth is configured.';
      setOauthError(Array.isArray(msg) ? msg[0] : String(msg));
    }
  }, []);

  const handleOAuthNavigation = useCallback(async (event: WebViewNavigation) => {
    const url = event.url;
    if (!oauthProvider) return;

    const callbackPath = `/auth/oauth/${oauthProvider}/callback`;
    if (url.includes(callbackPath) && url.includes('code=')) {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      if (!code) return;

      setOauthUrl(null);
      setLoading(true);
      setOauthError(null);
      try {
        const tokenRes = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/oauth/${oauthProvider}/callback`,
          { code, state: oauthState, redirect_uri: `${API_BASE_URL}/auth/oauth/${oauthProvider}/callback` },
          { headers: { 'X-Client': 'mobile' } },
        );
        const tokens = tokenRes.data;
        const meRes = await axios.get<UserResponse>(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        await loginWithTokens(tokens, meRes.data);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          (typeof err?.response?.data === 'string' ? err.response.data : null) ||
          err?.message ||
          'Sign-in failed. Try again.';
        setOauthError(Array.isArray(msg) ? msg[0] : String(msg));
      }
      setLoading(false);
      setOauthProvider(null);
    }
  }, [oauthProvider, oauthState, loginWithTokens]);

  // Show OAuth WebView
  if (oauthUrl) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.webviewHeader}>
          <TouchableOpacity
            onPress={() => { setOauthUrl(null); setOauthProvider(null); setLoading(false); }}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>
            Sign in with {oauthProvider === 'google' ? 'Google' : 'LinkedIn'}
          </Text>
          <View style={{ width: 26 }} />
        </View>
        <WebView
          source={{ uri: oauthUrl }}
          onNavigationStateChange={handleOAuthNavigation}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top section */}
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>S</Text>
        </View>
        <Text style={styles.appName}>Startr</Text>
        <Text style={styles.tagline}>Where founders meet investors</Text>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {oauthError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{oauthError}</Text>
            <TouchableOpacity onPress={() => setOauthError(null)} hitSlop={8} style={styles.errorDismiss}>
              <Ionicons name="close" size={20} color="#f87171" />
            </TouchableOpacity>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator size="large" color="#fbbf24" style={{ marginBottom: 32 }} />
        ) : (
          <>
            {/* Google */}
            <TouchableOpacity
              style={styles.oauthBtn}
              onPress={() => startOAuth('google')}
              activeOpacity={0.7}
            >
              <View style={styles.oauthIconWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.oauthBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* LinkedIn */}
            <TouchableOpacity
              style={styles.oauthBtn}
              onPress={() => startOAuth('linkedin')}
              activeOpacity={0.7}
            >
              <View style={[styles.oauthIconWrap, { backgroundColor: '#0A66C2' }]}>
                <Text style={styles.linkedinIn}>in</Text>
              </View>
              <Text style={styles.oauthBtnText}>Continue with LinkedIn</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email sign in */}
            <TouchableOpacity
              style={styles.emailBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.emailBtnText}>Sign in with email</Text>
            </TouchableOpacity>

            {/* Create account */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.7}
            >
              <Text style={styles.createBtnText}>Create a new account</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060611',
  },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0d0e1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  webviewTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fbbf24',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#fca5a5',
  },
  errorDismiss: {
    marginLeft: 8,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  oauthIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  linkedinIn: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  oauthBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  emailBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emailBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  createBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
});

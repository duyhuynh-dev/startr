import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, type ProfileData, type ProfileUpdatePayload } from '../api/profiles';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, requestShowOnboarding } = useAuth();
  const profileId = user?.profile_id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [firm, setFirm] = useState('');
  const [companyName, setCompanyName] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await getProfile(profileId);
      setProfile(data);
      setHeadline(data.headline || '');
      setLocation(data.location || '');
      setFirm(data.firm || '');
      setCompanyName(data.company_name || '');
    } catch {}
  }, [profileId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const payload: ProfileUpdatePayload = {};
      if (headline.trim() !== (profile?.headline || '')) payload.headline = headline.trim();
      if (location.trim() !== (profile?.location || '')) payload.location = location.trim();
      if (firm.trim() !== (profile?.firm || '')) payload.firm = firm.trim();
      if (companyName.trim() !== (profile?.company_name || '')) payload.company_name = companyName.trim();

      if (Object.keys(payload).length > 0) {
        const updated = await updateProfile(profileId, payload);
        setProfile(updated);
      }
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        {profile && (
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} activeOpacity={0.7}>
            <Text style={styles.editBtn}>{loading ? 'Saving...' : editing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {editing ? (
          <View style={styles.editSection}>
            <Text style={styles.fieldLabel}>Headline</Text>
            <TextInput style={styles.fieldInput} value={headline} onChangeText={setHeadline} placeholder="Your headline" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput style={styles.fieldInput} value={location} onChangeText={setLocation} placeholder="City, Country" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={styles.fieldLabel}>Firm</Text>
            <TextInput style={styles.fieldInput} value={firm} onChangeText={setFirm} placeholder="Fund or firm name" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={styles.fieldLabel}>Company</Text>
            <TextInput style={styles.fieldInput} value={companyName} onChangeText={setCompanyName} placeholder="Company name" placeholderTextColor="rgba(255,255,255,0.2)" />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); fetchProfile(); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoSection}>
            {profile?.headline && (
              <View style={styles.infoRow}>
                <Ionicons name="text-outline" size={20} color="rgba(255,255,255,0.4)" />
                <Text style={styles.infoText}>{profile.headline}</Text>
              </View>
            )}
            {profile?.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.4)" />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}
            {profile?.role && (
              <View style={styles.infoRow}>
                <Ionicons name={profile.role === 'investor' ? 'briefcase-outline' : 'rocket-outline'} size={20} color="rgba(255,255,255,0.4)" />
                <Text style={styles.infoText}>{profile.role === 'investor' ? 'Investor' : 'Founder'}</Text>
              </View>
            )}
            {(profile?.firm || profile?.company_name) && (
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color="rgba(255,255,255,0.4)" />
                <Text style={styles.infoText}>{profile.firm || profile.company_name}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={styles.infoText}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={styles.infoText}>
                Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </Text>
            </View>
            {user?.is_verified && (
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34d399" />
                <Text style={styles.infoText}>Verified account</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.completeProfileBtn} onPress={requestShowOnboarding} activeOpacity={0.7}>
          <Ionicons name="person-add-outline" size={20} color="#fbbf24" />
          <Text style={styles.completeProfileText}>Complete your profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0d0e1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  editBtn: { fontSize: 15, fontWeight: '600', color: '#fbbf24' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  name: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginTop: 14 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  infoText: { fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  editSection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: 6, marginTop: 12 },
  fieldInput: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, fontSize: 15, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  cancelBtnText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  completeProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
  },
  completeProfileText: { fontSize: 16, fontWeight: '600', color: '#fbbf24' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 32, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#f87171' },
});

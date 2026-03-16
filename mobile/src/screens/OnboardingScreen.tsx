/**
 * Onboarding – same 3 steps as web app
 * Step 1: Basic info (full name, location, headline)
 * Step 2: Role-specific (investor vs founder)
 * Step 3: Prompt answers
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, type ProfileUpdatePayload } from '../api/profiles';
import { getPromptTemplates, type PromptTemplate } from '../api/prompts';

const SECTORS = ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'EdTech', 'E-commerce', 'Biotech', 'Enterprise Software', 'Consumer', 'Hardware', 'Other'];
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, signupRole } = useAuth();
  const profileId = user?.profile_id;
  const [role, setRole] = useState<'investor' | 'founder'>(signupRole ?? 'investor');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>({});

  // Step 1
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [headline, setHeadline] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Step 2 – investor
  const [firm, setFirm] = useState('');
  const [checkSizeMin, setCheckSizeMin] = useState('');
  const [checkSizeMax, setCheckSizeMax] = useState('');
  const [focusSectors, setFocusSectors] = useState<string[]>([]);
  const [focusStages, setFocusStages] = useState<string[]>([]);
  const [accreditationNote, setAccreditationNote] = useState('');

  // Step 2 – founder
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [revenueRunRate, setRevenueRunRate] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [runwayMonths, setRunwayMonths] = useState('');
  const [focusMarkets, setFocusMarkets] = useState<string[]>([]);
  const [focusMarketInput, setFocusMarketInput] = useState('');

  useEffect(() => {
    if (profileId) {
      getProfile(profileId).then((p) => {
        if (p.role === 'founder' || p.role === 'investor') setRole(p.role);
        setFullName(p.full_name || '');
        setLocation(p.location || '');
        setHeadline(p.headline || '');
        setLinkedinUrl((p as any).linkedin_url || '');
        setFirm(p.firm || '');
        setCompanyName(p.company_name || '');
        setCompanyUrl(p.company_url || '');
        if (p.check_size_min != null) setCheckSizeMin(String(p.check_size_min));
        if (p.check_size_max != null) setCheckSizeMax(String(p.check_size_max));
        if (p.focus_sectors?.length) setFocusSectors(p.focus_sectors);
        if (p.focus_stages?.length) setFocusStages(p.focus_stages);
        if (p.team_size != null) setTeamSize(String(p.team_size));
        if (p.runway_months != null) setRunwayMonths(String(p.runway_months));
      }).catch(() => {});
    }
  }, [profileId]);

  useEffect(() => {
    getPromptTemplates({ role, is_active: true }).then((t) => {
      setPromptTemplates(t.slice(0, 3));
      const init: Record<string, string> = {};
      t.slice(0, 3).forEach((x) => { init[x.id] = ''; });
      setPromptAnswers(init);
    }).catch(() => {});
  }, [role]);

  const toggleSector = (s: string) => {
    setFocusSectors((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };
  const toggleStage = (s: string) => {
    setFocusStages((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };
  const addFocusMarket = () => {
    const v = focusMarketInput.trim();
    if (v && !focusMarkets.includes(v)) {
      setFocusMarkets((prev) => [...prev, v]);
      setFocusMarketInput('');
    }
  };

  const handleFinish = async () => {
    if (!profileId) {
      onComplete();
      return;
    }
    setLoading(true);
    try {
      const payload: ProfileUpdatePayload = {
        location: location.trim() || undefined,
        headline: headline.trim() || undefined,
        ...(linkedinUrl.trim() && { extra_metadata: { linkedin_url: linkedinUrl.trim() } }),
      };
      if (role === 'investor') {
        payload.firm = firm.trim() || undefined;
        payload.check_size_min = checkSizeMin ? parseInt(checkSizeMin, 10) : undefined;
        payload.check_size_max = checkSizeMax ? parseInt(checkSizeMax, 10) : undefined;
        payload.focus_sectors = focusSectors.length ? focusSectors : undefined;
        payload.focus_stages = focusStages.length ? focusStages : undefined;
        payload.accreditation_note = accreditationNote.trim() || undefined;
      } else {
        payload.company_name = companyName.trim() || undefined;
        payload.company_url = companyUrl.trim() || undefined;
        payload.revenue_run_rate = revenueRunRate ? parseFloat(revenueRunRate) : undefined;
        payload.team_size = teamSize ? parseInt(teamSize, 10) : undefined;
        payload.runway_months = runwayMonths ? parseInt(runwayMonths, 10) : undefined;
        payload.focus_markets = focusMarkets.length ? focusMarkets : undefined;
      }
      payload.prompts = Object.entries(promptAnswers)
        .filter(([, content]) => (content || '').trim())
        .map(([templateId, content]) => ({ prompt_id: templateId, content: content.trim() }));
      if (payload.prompts?.length === 0) delete payload.prompts;

      await updateProfile(profileId, payload);
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save profile');
    }
    setLoading(false);
  };

  const totalSteps = 3;
  const stepLabels = ['Your profile', 'Details', 'Prompts'];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerBrand}>Startr</Text>
        <Text style={styles.headerTitle}>Step {step} of {totalSteps}</Text>
        <TouchableOpacity onPress={onComplete} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      <View style={styles.stepLabelsRow}>
        {stepLabels.map((label, i) => (
          <React.Fragment key={label}>
            <View style={styles.stepLabelItem}>
              <View style={[styles.stepLabelDot, i + 1 <= step && styles.stepLabelDotActive]}>
                {i + 1 < step ? <Ionicons name="checkmark" size={14} color="#060611" /> : <Text style={[styles.stepLabelNum, i + 1 <= step && styles.stepLabelNumActive]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabelText, i + 1 <= step && styles.stepLabelTextActive]}>{label}</Text>
            </View>
            {i < stepLabels.length - 1 && <View style={styles.stepLabelLine} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Set up your profile</Text>
            <Text style={styles.stepSubtitle}>Add your LinkedIn, title, and a photo so others know who you are.</Text>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Title / Headline</Text>
            <TextInput style={styles.input} value={headline} onChangeText={setHeadline} placeholder="e.g., Founder at TechCo · Series A" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>LinkedIn profile</Text>
            <TextInput style={styles.input} value={linkedinUrl} onChangeText={setLinkedinUrl} placeholder="https://linkedin.com/in/yourname" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="url" autoCapitalize="none" />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Start typing a city (e.g., San Francisco)..." placeholderTextColor="rgba(255,255,255,0.3)" />
          </>
        )}

        {step === 2 && role === 'investor' && (
          <>
            <Text style={styles.stepTitle}>Investment details</Text>
            <Text style={styles.stepSubtitle}>Help us match you with the right founders.</Text>
            <Text style={styles.label}>Firm Name</Text>
            <TextInput style={styles.input} value={firm} onChangeText={setFirm} placeholder="ABC Ventures" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Min Check Size ($)</Text>
            <TextInput style={styles.input} value={checkSizeMin} onChangeText={setCheckSizeMin} placeholder="50000" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Max Check Size ($)</Text>
            <TextInput style={styles.input} value={checkSizeMax} onChangeText={setCheckSizeMax} placeholder="500000" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Focus Sectors</Text>
            <View style={styles.chipRow}>
              {SECTORS.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, focusSectors.includes(s) && styles.chipActive]} onPress={() => toggleSector(s)}>
                  <Text style={[styles.chipText, focusSectors.includes(s) && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Focus Stages</Text>
            <View style={styles.chipRow}>
              {STAGES.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, focusStages.includes(s) && styles.chipActive]} onPress={() => toggleStage(s)}>
                  <Text style={[styles.chipText, focusStages.includes(s) && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Accreditation Note (Optional)</Text>
            <TextInput style={[styles.input, styles.textArea]} value={accreditationNote} onChangeText={setAccreditationNote} placeholder="Accredited investor status" placeholderTextColor="rgba(255,255,255,0.3)" multiline />
          </>
        )}

        {step === 2 && role === 'founder' && (
          <>
            <Text style={styles.stepTitle}>Startup details</Text>
            <Text style={styles.stepSubtitle}>Help us match you with the right investors.</Text>
            <Text style={styles.label}>Company Name</Text>
            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="StartupCo" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Company Website</Text>
            <TextInput style={styles.input} value={companyUrl} onChangeText={setCompanyUrl} placeholder="https://startupco.com" keyboardType="url" autoCapitalize="none" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Monthly Revenue Run Rate ($)</Text>
            <TextInput style={styles.input} value={revenueRunRate} onChangeText={setRevenueRunRate} placeholder="10000" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.helperText}>Monthly recurring revenue</Text>
            <Text style={styles.label}>Team Size</Text>
            <TextInput style={styles.input} value={teamSize} onChangeText={setTeamSize} placeholder="5" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.label}>Runway (months)</Text>
            <TextInput style={styles.input} value={runwayMonths} onChangeText={setRunwayMonths} placeholder="18" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
            <Text style={styles.helperText}>How many months of cash runway do you have?</Text>
            <Text style={styles.label}>Focus Markets</Text>
            <View style={styles.chipRow}>
              {focusMarkets.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                  <TouchableOpacity onPress={() => setFocusMarkets((p) => p.filter((x) => x !== m))} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} value={focusMarketInput} onChangeText={setFocusMarketInput} placeholder="Start typing a market (e.g., B2B SaaS, Healthcare)..." placeholderTextColor="rgba(255,255,255,0.3)" onSubmitEditing={addFocusMarket} returnKeyType="done" />
              <TouchableOpacity style={styles.addBtn} onPress={addFocusMarket}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Express yourself</Text>
            <Text style={styles.stepSubtitle}>Answer a few prompts so others can get to know you better.</Text>
            {promptTemplates.length === 0 ? (
              <ActivityIndicator size="small" color="#fbbf24" style={{ marginTop: 20 }} />
            ) : (
              promptTemplates.map((t) => (
                <View key={t.id} style={styles.promptBlock}>
                  <Text style={styles.label}>{t.text}</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={promptAnswers[t.id] ?? ''} onChangeText={(v) => setPromptAnswers((p) => ({ ...p, [t.id]: v }))} placeholder="Your answer..." placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={4} />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={step > 1 ? () => setStep(step - 1) : undefined} disabled={step === 1}>
          <Text style={[styles.backBtnText, step === 1 && styles.backBtnTextDisabled]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextBtn, loading && styles.nextBtnDisabled]} onPress={step === totalSteps ? handleFinish : () => setStep(step + 1)} disabled={loading} activeOpacity={0.7}>
          <Text style={styles.nextBtnText}>{loading ? 'Creating profile...' : step === totalSteps ? 'Complete profile' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBrand: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  headerTitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  skipText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  progressBarBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressBarFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 1 },
  stepLabelsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
  stepLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabelDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabelDotActive: { backgroundColor: '#fbbf24' },
  stepLabelNum: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  stepLabelNumActive: { color: '#060611' },
  stepLabelText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  stepLabelTextActive: { color: '#ffffff' },
  stepLabelLine: { width: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  content: { padding: 24 },
  stepTitle: { fontSize: 22, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 0 },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#ffffff',
  },
  textArea: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipActive: { borderColor: 'rgba(251,191,36,0.6)', backgroundColor: 'rgba(251,191,36,0.15)' },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  chipTextActive: { color: '#fbbf24', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f59e0b' },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  promptBlock: { marginBottom: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#060611',
  },
  backBtn: { paddingVertical: 10, paddingRight: 16 },
  backBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  backBtnTextDisabled: { opacity: 0.4 },
  nextBtn: { paddingHorizontal: 24, height: 44, borderRadius: 14, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#060611' },
});

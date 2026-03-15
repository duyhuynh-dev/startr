/**
 * Onboarding flow – Clean multi-step form matching Contra aesthetic
 * Step 1: LinkedIn + headline + photo
 * Step 2: Role-specific details
 * Step 3: Prompts
 */

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LocationAutocomplete } from '@/components/ui';
import { OnboardingStep2Investor } from '@/components/features/onboarding/Step2Investor';
import { OnboardingStep2Founder } from '@/components/features/onboarding/Step2Founder';
import { OnboardingStep3 } from '@/components/features/onboarding/Step3Prompts';
import { profilesApi } from '@/lib/api/profiles';
import type { ProfileCreate } from '@/lib/api/types';

type OnboardingData = {
  fullName: string;
  location: string;
  headline: string;
  linkedinUrl: string;
  role: 'investor' | 'founder';
  avatarFile: File | null;
  avatarPreview: string;
  firm?: string;
  checkSizeMin?: number;
  checkSizeMax?: number;
  focusSectors?: string[];
  focusStages?: string[];
  accreditationNote?: string;
  companyName?: string;
  companyUrl?: string;
  revenueRunRate?: number;
  teamSize?: number;
  runwayMonths?: number;
  focusMarkets?: string[];
  prompts?: Array<{ content: string; template_id: string }>;
};

function OnboardingContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitialRole = (): 'investor' | 'founder' => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'founder' || roleParam === 'investor') return roleParam;
    return 'investor';
  };

  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    location: '',
    headline: '',
    linkedinUrl: '',
    role: getInitialRole(),
    avatarFile: null,
    avatarPreview: '',
  });

  const totalSteps = 3;

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (user?.profile_id) {
        try {
          const profile = await profilesApi.getProfile(user.profile_id);
          setFormData((prev) => ({
            ...prev,
            role: profile.role,
            fullName: profile.full_name || prev.fullName,
            location: profile.location || prev.location,
            headline: profile.headline || prev.headline,
            avatarPreview: profile.avatar_url || '',
            firm: profile.firm || prev.firm,
            checkSizeMin: profile.check_size_min || prev.checkSizeMin,
            checkSizeMax: profile.check_size_max || prev.checkSizeMax,
            focusSectors: profile.focus_sectors || prev.focusSectors,
            focusStages: profile.focus_stages || prev.focusStages,
            accreditationNote: profile.accreditation_note || prev.accreditationNote,
            companyName: profile.company_name || prev.companyName,
            companyUrl: profile.company_url || prev.companyUrl,
            revenueRunRate: profile.revenue_run_rate || prev.revenueRunRate,
            teamSize: profile.team_size || prev.teamSize,
            runwayMonths: profile.runway_months || prev.runwayMonths,
            focusMarkets: profile.focus_markets || prev.focusMarkets,
          }));
        } catch {
          // continue with defaults
        }
      }
    };
    loadExistingProfile();
  }, [user?.profile_id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData((prev) => ({
          ...prev,
          avatarFile: file,
          avatarPreview: ev.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      setError('User email not found. Please log in again.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // Upload avatar photo if one was selected
      let avatarUrl: string | undefined;
      if (formData.avatarFile) {
        const uploadedUrl = await profilesApi.uploadProfilePhoto(formData.avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else if (formData.avatarPreview) {
          avatarUrl = formData.avatarPreview;
        }
      }

      const transformedPrompts = (formData.prompts || []).map((p) => ({
        prompt_id: p.template_id,
        content: p.content,
      }));

      const profileData: ProfileCreate = {
        full_name: formData.fullName,
        email: user.email,
        location: formData.location,
        headline: formData.headline,
        role: formData.role,
        avatar_url: avatarUrl,
        prompts: transformedPrompts,
        ...(formData.role === 'investor' && {
          firm: formData.firm,
          check_size_min: formData.checkSizeMin,
          check_size_max: formData.checkSizeMax,
          focus_sectors: formData.focusSectors || [],
          focus_stages: formData.focusStages || [],
          accreditation_note: formData.accreditationNote,
        }),
        ...(formData.role === 'founder' && {
          company_name: formData.companyName,
          company_url: formData.companyUrl,
          revenue_run_rate: formData.revenueRunRate,
          team_size: formData.teamSize,
          runway_months: formData.runwayMonths,
          focus_markets: formData.focusMarkets || [],
        }),
      };

      await profilesApi.createProfile(profileData);
      await refreshUser();
      router.push('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels = ['Your profile', 'Details', 'Prompts'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#060611]">
        {/* Top bar */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-white tracking-tight">Startr</span>
            <span className="text-sm text-white/30">Step {currentStep} of {totalSteps}</span>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-white/5">
            <motion.div
              className="h-full bg-linear-to-r from-amber-400 to-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-6 py-12">
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i + 1 <= currentStep ? 'bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611]' : 'bg-white/10 text-white/40'
                }`}>
                  {i + 1 < currentStep ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium ${i + 1 <= currentStep ? 'text-white' : 'text-white/30'}`}>{label}</span>
                {i < stepLabels.length - 1 && <div className="w-8 h-px bg-white/10 mx-1" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 1: Profile essentials */}
              {currentStep === 1 && (
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">Set up your profile</h1>
                  <p className="text-white/40 text-sm mb-8">Add your LinkedIn, title, and a photo so others know who you are.</p>

                  <div className="space-y-6">
                    {/* Photo upload */}
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden hover:border-white/40 transition-colors shrink-0"
                      >
                        {formData.avatarPreview ? (
                          <img src={formData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">Profile photo</p>
                        <p className="text-xs text-white/40">JPG, PNG. Recommended 400x400px.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Full name</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Title / Headline</label>
                      <input
                        type="text"
                        value={formData.headline}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="e.g., Founder at TechCo · Series A"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">LinkedIn profile</label>
                      <input
                        type="url"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/yourname"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                      />
                    </div>

                    <LocationAutocomplete
                      label="Location"
                      value={formData.location}
                      onChange={(value) => setFormData({ ...formData, location: value })}
                      placeholder="Start typing a city (e.g., San Francisco)..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Role-specific (re-skinned) */}
              {currentStep === 2 && (
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">
                    {formData.role === 'investor' ? 'Investment details' : 'Startup details'}
                  </h1>
                  <p className="text-white/40 text-sm mb-8">
                    Help us match you with the right {formData.role === 'investor' ? 'founders' : 'investors'}.
                  </p>

                  <div className="[&_h2]:hidden [&_label]:text-white/70 [&_input]:rounded-xl [&_input]:border-white/10 [&_input]:bg-white/5 [&_input]:text-white [&_input]:placeholder:text-white/20 [&_input]:focus:ring-amber-500/20">
                    {formData.role === 'investor' ? (
                      <OnboardingStep2Investor
                        data={formData}
                        onChange={(data) => setFormData({ ...formData, ...data })}
                      />
                    ) : (
                      <OnboardingStep2Founder
                        data={formData}
                        onChange={(data) => setFormData({ ...formData, ...data })}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Prompts */}
              {currentStep === 3 && (
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">Express yourself</h1>
                  <p className="text-white/40 text-sm mb-8">
                    Answer a few prompts so others can get to know you better.
                  </p>

                  <div className="[&_h2]:hidden [&_label]:text-white/70">
                    <OnboardingStep3
                      role={formData.role}
                      data={formData}
                      onChange={(data) => setFormData({ ...formData, ...data })}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-sm font-medium text-white/40 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold px-8 py-2.5 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold px-8 py-2.5 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating profile...' : 'Complete profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060611]">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

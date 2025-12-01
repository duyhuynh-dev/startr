/**
 * Onboarding flow - Multi-step form for creating profile
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OnboardingStep1 } from '@/components/features/onboarding/Step1BasicInfo';
import { OnboardingStep2Investor } from '@/components/features/onboarding/Step2Investor';
import { OnboardingStep2Founder } from '@/components/features/onboarding/Step2Founder';
import { OnboardingStep3 } from '@/components/features/onboarding/Step3Prompts';
import { profilesApi } from '@/lib/api/profiles';
import type { ProfileCreate } from '@/lib/api/types';

type OnboardingData = {
  // Step 1: Basic Info
  fullName: string;
  location: string;
  headline: string;
  // Step 2: Role-specific
  role: 'investor' | 'founder';
  // Investor fields
  firm?: string;
  checkSizeMin?: number;
  checkSizeMax?: number;
  focusSectors?: string[];
  focusStages?: string[];
  accreditationNote?: string;
  // Founder fields
  companyName?: string;
  companyUrl?: string;
  revenueRunRate?: number;
  teamSize?: number;
  runwayMonths?: number;
  focusMarkets?: string[];
  // Step 3: Prompts
  prompts?: Array<{ content: string; template_id: string }>;
};

function OnboardingContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get role from URL params first, or from existing profile
  const getInitialRole = (): 'investor' | 'founder' => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'founder' || roleParam === 'investor') {
      return roleParam;
    }
    // Default to investor if no role specified
    return 'investor';
  };
  
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    location: '',
    headline: '',
    role: getInitialRole(), // Get role from URL params or default
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Fetch existing profile data if profile_id exists
  useEffect(() => {
    const loadExistingProfile = async () => {
      if (user?.profile_id) {
        try {
          const profile = await profilesApi.getProfile(user.profile_id);
          // Update form data with existing profile data
          setFormData((prev) => ({
            ...prev,
            role: profile.role, // Set role from profile
            fullName: profile.full_name || prev.fullName,
            location: profile.location || prev.location,
            headline: profile.headline || prev.headline,
            // Investor fields
            firm: profile.firm || prev.firm,
            checkSizeMin: profile.check_size_min || prev.checkSizeMin,
            checkSizeMax: profile.check_size_max || prev.checkSizeMax,
            focusSectors: profile.focus_sectors || prev.focusSectors,
            focusStages: profile.focus_stages || prev.focusStages,
            accreditationNote: profile.accreditation_note || prev.accreditationNote,
            // Founder fields
            companyName: profile.company_name || prev.companyName,
            companyUrl: profile.company_url || prev.companyUrl,
            revenueRunRate: profile.revenue_run_rate || prev.revenueRunRate,
            teamSize: profile.team_size || prev.teamSize,
            runwayMonths: profile.runway_months || prev.runwayMonths,
            focusMarkets: profile.focus_markets || prev.focusMarkets,
          }));
        } catch (err) {
          console.error('Failed to load existing profile:', err);
          // Continue with default values if profile fetch fails
        }
      }
    };

    loadExistingProfile();
  }, [user?.profile_id]);

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
      // Transform prompts from {template_id, content} to {prompt_id, content}
      const transformedPrompts = (formData.prompts || []).map((p) => ({
        prompt_id: p.template_id, // Backend expects prompt_id, but we use template_id internally
        content: p.content,
      }));

      const profileData: ProfileCreate = {
        full_name: formData.fullName,
        email: user.email, // Required field from user auth
        location: formData.location,
        headline: formData.headline,
        role: formData.role,
        prompts: transformedPrompts,
        // Investor fields
        ...(formData.role === 'investor' && {
          firm: formData.firm,
          check_size_min: formData.checkSizeMin,
          check_size_max: formData.checkSizeMax,
          focus_sectors: formData.focusSectors || [],
          focus_stages: formData.focusStages || [],
          accreditation_note: formData.accreditationNote,
        }),
        // Founder fields
        ...(formData.role === 'founder' && {
          company_name: formData.companyName,
          company_url: formData.companyUrl,
          revenue_run_rate: formData.revenueRunRate,
          team_size: formData.teamSize,
          runway_months: formData.runwayMonths,
          focus_markets: formData.focusMarkets || [],
        }),
      };

      const createdProfile = await profilesApi.createProfile(profileData);
      
      // Refresh user context to get updated profile_id
      if (user) {
        await refreshUser();
      }
      
      router.push('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-100">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-slate-100">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <OnboardingStep1
                  data={formData}
                  onChange={(data) => setFormData({ ...formData, ...data })}
                />
              )}

              {/* Step 2: Role-specific */}
              {currentStep === 2 && formData.role === 'investor' && (
                <OnboardingStep2Investor
                  data={formData}
                  onChange={(data) => setFormData({ ...formData, ...data })}
                />
              )}

              {currentStep === 2 && formData.role === 'founder' && (
                <OnboardingStep2Founder
                  data={formData}
                  onChange={(data) => setFormData({ ...formData, ...data })}
                />
              )}

              {/* Step 3: Prompts */}
              {currentStep === 3 && (
                <OnboardingStep3
                  role={formData.role}
                  data={formData}
                  onChange={(data) => setFormData({ ...formData, ...data })}
                />
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isLoading}
                >
                  Back
                </Button>

                {currentStep < totalSteps ? (
                  <Button variant="primary" onClick={handleNext} disabled={isLoading}>
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Complete Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}


/**
 * Profile page – Dark glassmorphism theme
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { profilesApi, type ProfileUpdate } from '@/lib/api/profiles';
import { verificationApi, type VerificationStatus } from '@/lib/api/verification';
import type { BaseProfile } from '@/lib/api/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const [formData, setFormData] = useState<ProfileUpdate>({});
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.profile_id) return;

    setIsUploadingPhoto(true);
    setError('');
    try {
      const uploadedUrl = await profilesApi.uploadProfilePhoto(file);
      const avatarUrl = uploadedUrl || URL.createObjectURL(file);

      await profilesApi.updateProfile(user.profile_id, { avatar_url: avatarUrl });

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      setSuccess('Photo updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.profile_id) return;
      setIsLoading(true);
      try {
        const data = await profilesApi.getProfile(user.profile_id);
        setProfile(data);
        setFormData({
          headline: data.headline || '',
          location: data.location || '',
          firm: data.firm || '',
          company_name: data.company_name || '',
          company_url: data.company_url || '',
          revenue_run_rate: data.revenue_run_rate,
          team_size: data.team_size,
          runway_months: data.runway_months,
          focus_markets: data.focus_markets || [],
          focus_sectors: data.focus_sectors || [],
          focus_stages: data.focus_stages || [],
          check_size_min: data.check_size_min,
          check_size_max: data.check_size_max,
        });
        try {
          const verStatus = await verificationApi.getVerificationStatus();
          setVerificationStatus(verStatus);
        } catch {
          // ignore
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user?.profile_id]);

  const handleRequestOTP = async () => {
    if (!user?.email) return;
    setIsRequestingOTP(true);
    setOtpMessage('');
    setError('');
    try {
      const result = await verificationApi.requestEmailOTP(user.email);
      setOtpMessage(result.message);
      setShowOTPInput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!user?.email || !otpCode) return;
    setIsVerifyingOTP(true);
    setError('');
    try {
      await verificationApi.verifyEmailOTP(user.email, otpCode);
      setSuccess('Email verified successfully!');
      setShowOTPInput(false);
      setOtpCode('');
      const verStatus = await verificationApi.getVerificationStatus();
      setVerificationStatus(verStatus);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSave = async () => {
    if (!user?.profile_id || !profile) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const updatedProfile = await profilesApi.updateProfile(user.profile_id, formData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        headline: profile.headline || '',
        location: profile.location || '',
        firm: profile.firm || '',
        company_name: profile.company_name || '',
        company_url: profile.company_url || '',
        revenue_run_rate: profile.revenue_run_rate,
        team_size: profile.team_size,
        runway_months: profile.runway_months,
        focus_markets: profile.focus_markets || [],
        focus_sectors: profile.focus_sectors || [],
        focus_stages: profile.focus_stages || [],
        check_size_min: profile.check_size_min,
        check_size_max: profile.check_size_max,
      });
    }
    setIsEditing(false);
    setError('');
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors';

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 lg:px-10 py-5">
          <div className="flex items-center justify-between max-w-3xl">
            <div>
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="text-sm text-white/40 mt-0.5">Manage your profile and settings.</p>
            </div>
            {profile && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="max-w-3xl">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
              </div>
            ) : !profile ? (
              <div className="text-center py-24">
                <p className="text-red-400 text-sm">{error || 'Profile not found'}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">{success}</div>
                )}

                {/* Basic info card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative group">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-xl font-semibold text-white/70">
                          {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {isUploadingPhoto ? (
                          <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                          <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">{profile.full_name}</h2>
                      <p className="text-sm text-white/40">{user?.email}</p>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/5 text-white/50">
                        {profile.role}
                      </span>
                    </div>
                  </div>

                  {/* Verification */}
                  {verificationStatus && (
                    <div className="border-t border-white/5 pt-4 mb-4">
                      {verificationStatus.email_verified ? (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-emerald-400 font-medium">Email verified</span>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <p className="text-sm text-amber-400 font-medium mb-2">Verify your email</p>
                          {!showOTPInput ? (
                            <button
                              type="button"
                              onClick={handleRequestOTP}
                              disabled={isRequestingOTP}
                              className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-xs font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-50"
                            >
                              {isRequestingOTP ? 'Sending...' : 'Send verification code'}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {otpMessage && <p className="text-xs text-emerald-400">{otpMessage}</p>}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  placeholder="6-digit code"
                                  maxLength={6}
                                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyOTP}
                                  disabled={isVerifyingOTP || otpCode.length !== 6}
                                  className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-xs font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-50"
                                >
                                  {isVerifyingOTP ? 'Verifying...' : 'Verify'}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleRequestOTP}
                                disabled={isRequestingOTP}
                                className="text-xs text-white/40 hover:text-white/70 transition-colors"
                              >
                                Resend code
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <Field label="Headline" value={profile.headline} editing={isEditing}>
                      <input
                        type="text"
                        value={formData.headline || ''}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="Brief description"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Location" value={profile.location} editing={isEditing}>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City, State"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>

                {/* Role-specific card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                    {profile.role === 'investor' ? 'Investment details' : 'Startup details'}
                  </h3>

                  <div className="space-y-4">
                    {profile.role === 'investor' && (
                      <>
                        <Field label="Firm" value={profile.firm} editing={isEditing}>
                          <input
                            type="text"
                            value={formData.firm || ''}
                            onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                            placeholder="Firm name"
                            className={inputCls}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Min check size" value={profile.check_size_min ? `$${profile.check_size_min.toLocaleString()}` : undefined} editing={isEditing}>
                            <input
                              type="number"
                              value={formData.check_size_min || ''}
                              onChange={(e) => setFormData({ ...formData, check_size_min: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="Min"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Max check size" value={profile.check_size_max ? `$${profile.check_size_max.toLocaleString()}` : undefined} editing={isEditing}>
                            <input
                              type="number"
                              value={formData.check_size_max || ''}
                              onChange={(e) => setFormData({ ...formData, check_size_max: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="Max"
                              className={inputCls}
                            />
                          </Field>
                        </div>
                        {profile.focus_sectors && profile.focus_sectors.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-white/40 mb-1.5">Sectors</label>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.focus_sectors.map((s) => (
                                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/3 border border-white/10 text-xs text-white/70">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {profile.focus_stages && profile.focus_stages.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-white/40 mb-1.5">Stages</label>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.focus_stages.map((s) => (
                                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/3 border border-white/10 text-xs text-white/70">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {profile.role === 'founder' && (
                      <>
                        <Field label="Company" value={profile.company_name} editing={isEditing}>
                          <input
                            type="text"
                            value={formData.company_name || ''}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            placeholder="Company name"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Website" value={profile.company_url} editing={isEditing}>
                          <input
                            type="url"
                            value={formData.company_url || ''}
                            onChange={(e) => setFormData({ ...formData, company_url: e.target.value })}
                            placeholder="https://..."
                            className={inputCls}
                          />
                        </Field>
                        <div className="grid grid-cols-3 gap-4">
                          <Field label="MRR" value={profile.revenue_run_rate ? `$${profile.revenue_run_rate.toLocaleString()}` : undefined} editing={isEditing}>
                            <input
                              type="number"
                              value={formData.revenue_run_rate || ''}
                              onChange={(e) => setFormData({ ...formData, revenue_run_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="MRR"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Team size" value={profile.team_size ? `${profile.team_size}` : undefined} editing={isEditing}>
                            <input
                              type="number"
                              value={formData.team_size || ''}
                              onChange={(e) => setFormData({ ...formData, team_size: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="Size"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Runway" value={profile.runway_months ? `${profile.runway_months}mo` : undefined} editing={isEditing}>
                            <input
                              type="number"
                              value={formData.runway_months || ''}
                              onChange={(e) => setFormData({ ...formData, runway_months: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="Months"
                              className={inputCls}
                            />
                          </Field>
                        </div>
                        {profile.focus_markets && profile.focus_markets.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-white/40 mb-1.5">Markets</label>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.focus_markets.map((m) => (
                                <span key={m} className="px-2.5 py-1 rounded-lg bg-white/3 border border-white/10 text-xs text-white/70">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Prompts card */}
                {profile.prompts && profile.prompts.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Prompts</h3>
                    <div className="space-y-3">
                      {profile.prompts.map((prompt, idx) => (
                        <div key={idx} className="bg-white/3 rounded-xl p-4">
                          <p className="text-sm text-white/70 leading-relaxed">{prompt.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit buttons */}
                {isEditing && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Field({ label, value, editing, children }: {
  label: string;
  value?: string | null;
  editing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 mb-1.5">{label}</label>
      {editing ? children : (
        <p className="text-sm text-white">{value || <span className="text-white/30">Not set</span>}</p>
      )}
    </div>
  );
}

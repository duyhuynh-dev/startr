/**
 * Profile Management Page
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  LoadingSpinner,
  Textarea,
  LocationAutocomplete,
  VerificationBadges,
  VerificationLevelBadge,
} from "@/components/ui";
import { MarketAutocomplete } from "@/components/ui/MarketAutocomplete";
import { profilesApi, type ProfileUpdate } from "@/lib/api/profiles";
import { verificationApi, type VerificationStatus } from "@/lib/api/verification";
import type { BaseProfile } from "@/lib/api/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState<ProfileUpdate>({});

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.profile_id) return;

      setIsLoading(true);
      try {
        const data = await profilesApi.getProfile(user.profile_id);
        setProfile(data);
        // Initialize form data with current profile data
        setFormData({
          headline: data.headline || "",
          location: data.location || "",
          firm: data.firm || "",
          company_name: data.company_name || "",
          company_url: data.company_url || "",
          revenue_run_rate: data.revenue_run_rate,
          team_size: data.team_size,
          runway_months: data.runway_months,
          focus_markets: data.focus_markets || [],
          focus_sectors: data.focus_sectors || [],
          focus_stages: data.focus_stages || [],
          check_size_min: data.check_size_min,
          check_size_max: data.check_size_max,
        });
        
        // Load verification status
        try {
          const verStatus = await verificationApi.getVerificationStatus();
          setVerificationStatus(verStatus);
        } catch (verErr) {
          console.error("Failed to load verification status:", verErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.profile_id]);
  
  const handleRequestOTP = async () => {
    if (!user?.email) return;
    
    setIsRequestingOTP(true);
    setOtpMessage("");
    setError("");
    
    try {
      const result = await verificationApi.requestEmailOTP(user.email);
      setOtpMessage(result.message);
      setShowOTPInput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setIsRequestingOTP(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!user?.email || !otpCode) return;
    
    setIsVerifyingOTP(true);
    setError("");
    
    try {
      await verificationApi.verifyEmailOTP(user.email, otpCode);
      setSuccess("Email verified successfully!");
      setShowOTPInput(false);
      setOtpCode("");
      
      // Reload verification status
      const verStatus = await verificationApi.getVerificationStatus();
      setVerificationStatus(verStatus);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSave = async () => {
    if (!user?.profile_id || !profile) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedProfile = await profilesApi.updateProfile(
        user.profile_id,
        formData
      );
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        headline: profile.headline || "",
        location: profile.location || "",
        firm: profile.firm || "",
        company_name: profile.company_name || "",
        company_url: profile.company_url || "",
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
    setError("");
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || "Profile not found"}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>My Profile</CardTitle>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                {/* Full Name - Read only */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1">
                    Full Name
                  </label>
                  <p className="text-slate-100">{profile.full_name}</p>
                </div>

                {/* Email - Read only */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1">
                    Email
                  </label>
                  <p className="text-slate-100">{user?.email || "N/A"}</p>
                </div>

                {/* Role - Read only */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1">
                    Role
                  </label>
                  <p className="text-slate-100 capitalize">{profile.role}</p>
                </div>

                {/* Verification Section */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <label className="block text-sm font-semibold text-slate-100 mb-3">
                    Verification Status
                  </label>
                  
                  {verificationStatus && (
                    <div className="space-y-3">
                      {/* Verification Level - only show if level > 0 */}
                      {verificationStatus.level > 0 && (
                        <div className="flex items-center gap-3">
                          <VerificationLevelBadge 
                            level={verificationStatus.level} 
                            levelName={verificationStatus.level_name}
                            size="md"
                          />
                        </div>
                      )}
                      
                      {/* Badges */}
                      {verificationStatus.badges.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Your badges:</p>
                          <VerificationBadges 
                            badges={verificationStatus.badges} 
                            size="md" 
                            showLabels 
                          />
                        </div>
                      )}
                      
                      {/* Email Verification */}
                      {!verificationStatus.email_verified && (
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                          <p className="text-amber-400 text-sm mb-3">
                            Verify your email to unlock more features
                          </p>
                          
                          {!showOTPInput ? (
                            <Button
                              variant="primary"
                              onClick={handleRequestOTP}
                              disabled={isRequestingOTP}
                              isLoading={isRequestingOTP}
                              className="text-sm"
                            >
                              Send Verification Code
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              {otpMessage && (
                                <p className="text-green-400 text-sm">{otpMessage}</p>
                              )}
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  placeholder="Enter 6-digit code"
                                  className="flex-1 text-center tracking-widest font-mono"
                                  maxLength={6}
                                />
                                <Button
                                  variant="primary"
                                  onClick={handleVerifyOTP}
                                  disabled={isVerifyingOTP || otpCode.length !== 6}
                                  isLoading={isVerifyingOTP}
                                >
                                  Verify
                                </Button>
                              </div>
                              <button
                                type="button"
                                onClick={handleRequestOTP}
                                disabled={isRequestingOTP}
                                className="text-sm text-amber-400 hover:text-amber-300 underline"
                              >
                                Resend code
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {verificationStatus.email_verified && (
                        <p className="text-green-400 text-sm">Email verified</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Headline - Editable */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1">
                    Headline
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.headline || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, headline: e.target.value })
                      }
                      placeholder="Brief description of yourself or your company"
                    />
                  ) : (
                    <p className="text-slate-100">
                      {profile.headline || "Not set"}
                    </p>
                  )}
                </div>

                {/* Location - Editable */}
                <div>
                  <label className="block text-sm font-semibold text-slate-100 mb-1">
                    Location
                  </label>
                  {isEditing ? (
                    <LocationAutocomplete
                      value={formData.location || ""}
                      onChange={(value) =>
                        setFormData({ ...formData, location: value })
                      }
                      placeholder="Start typing a location..."
                    />
                  ) : (
                    <p className="text-slate-100">
                      {profile.location || "Not set"}
                    </p>
                  )}
                </div>

                {/* Investor-specific fields */}
                {profile.role === "investor" && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Firm
                      </label>
                      {isEditing ? (
                        <Input
                          value={formData.firm || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, firm: e.target.value })
                          }
                          placeholder="Your firm name"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.firm || "Not set"}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-1">
                          Min Check Size (USD)
                        </label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={formData.check_size_min || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                check_size_min: e.target.value
                                  ? Number.parseInt(e.target.value, 10)
                                  : undefined,
                              })
                            }
                            placeholder="Minimum"
                          />
                        ) : (
                          <p className="text-slate-100">
                            {profile.check_size_min
                              ? `$${profile.check_size_min.toLocaleString()}`
                              : "Not set"}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-1">
                          Max Check Size (USD)
                        </label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={formData.check_size_max || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                check_size_max: e.target.value
                                  ? Number.parseInt(e.target.value, 10)
                                  : undefined,
                              })
                            }
                            placeholder="Maximum"
                          />
                        ) : (
                          <p className="text-slate-100">
                            {profile.check_size_max
                              ? `$${profile.check_size_max.toLocaleString()}`
                              : "Not set"}
                          </p>
                        )}
                      </div>
                    </div>

                    {profile.focus_sectors &&
                      profile.focus_sectors.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-100 mb-1">
                            Focus Sectors
                          </label>
                          <p className="text-slate-100">
                            {profile.focus_sectors.join(", ")}
                          </p>
                          {isEditing && (
                            <p className="text-sm text-slate-100 mt-1">
                              Note: Focus sectors cannot be edited here. Please
                              contact support to change.
                            </p>
                          )}
                        </div>
                      )}
                  </>
                )}

                {/* Founder-specific fields */}
                {profile.role === "founder" && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Company Name
                      </label>
                      {isEditing ? (
                        <Input
                          value={formData.company_name || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company_name: e.target.value,
                            })
                          }
                          placeholder="Your company name"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.company_name || "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Company URL
                      </label>
                      {isEditing ? (
                        <Input
                          type="url"
                          value={formData.company_url || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company_url: e.target.value,
                            })
                          }
                          placeholder="https://yourcompany.com"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.company_url ? (
                            <a
                              href={profile.company_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-500 hover:text-amber-400 hover:underline"
                            >
                              {profile.company_url}
                            </a>
                          ) : (
                            "Not set"
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Monthly Revenue (USD)
                      </label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={formData.revenue_run_rate || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              revenue_run_rate: e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Monthly revenue"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.revenue_run_rate
                            ? `$${profile.revenue_run_rate.toLocaleString()}`
                            : "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Team Size
                      </label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={formData.team_size || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              team_size: e.target.value
                                ? Number.parseInt(e.target.value, 10)
                                : undefined,
                            })
                          }
                          placeholder="Number of employees"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.team_size
                            ? `${profile.team_size} people`
                            : "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Runway (months)
                      </label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={formData.runway_months || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              runway_months: e.target.value
                                ? Number.parseInt(e.target.value, 10)
                                : undefined,
                            })
                          }
                          placeholder="Months of runway remaining"
                        />
                      ) : (
                        <p className="text-slate-100">
                          {profile.runway_months
                            ? `${profile.runway_months} months`
                            : "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-100 mb-1">
                        Focus Markets
                      </label>
                      {isEditing ? (
                        <MarketAutocomplete
                          value={formData.focus_markets || []}
                          onChange={(markets) =>
                            setFormData({ ...formData, focus_markets: markets })
                          }
                          placeholder="Search and select markets..."
                          helperText="Select from supported markets for matching"
                        />
                      ) : (
                        <div>
                          {profile.focus_markets &&
                          profile.focus_markets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {profile.focus_markets.map((market) => (
                                <span
                                  key={market}
                                  className="inline-flex items-center px-3 py-1 bg-amber-500/20 text-amber-100 rounded-full text-sm border border-amber-500/30"
                                >
                                  {market}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-100">Not set</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Prompts - Read only for now */}
                {profile.prompts && profile.prompts.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-100 mb-2">
                      Prompts
                    </label>
                    <div className="space-y-3">
                      {profile.prompts.map((prompt, idx) => (
                        <div
                          key={idx}
                          className="border-l-4 border-amber-500 pl-4"
                        >
                          <p className="text-slate-100">{prompt.content}</p>
                        </div>
                      ))}
                    </div>
                    {isEditing && (
                      <p className="text-sm text-slate-100 mt-2">
                        Note: Prompts cannot be edited here. Please contact
                        support to change.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Edit mode action buttons */}
              {isEditing && (
                <div className="mt-6 flex gap-4">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

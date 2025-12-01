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
} from "@/components/ui";
import { profilesApi, type ProfileUpdate } from "@/lib/api/profiles";
import type { BaseProfile } from "@/lib/api/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          focus_sectors: data.focus_sectors || [],
          focus_stages: data.focus_stages || [],
          check_size_min: data.check_size_min,
          check_size_max: data.check_size_max,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.profile_id]);

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

/**
 * Onboarding Step 1: Basic Information
 */

'use client';

import { Input, Textarea, LocationAutocomplete } from '@/components/ui';

interface Step1Data {
  fullName: string;
  location: string;
  headline: string;
}

interface Step1Props {
  data: Step1Data;
  onChange: (data: Partial<Step1Data>) => void;
}

export function OnboardingStep1({ data, onChange }: Step1Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Basic Information</h2>

      <Input
        label="Full Name"
        value={data.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
        required
        placeholder="John Doe"
      />

      <LocationAutocomplete
        label="Location"
        value={data.location}
        onChange={(value) => onChange({ location: value })}
        placeholder="Start typing a location (e.g., New York)..."
      />

      <Textarea
        label="Headline"
        value={data.headline}
        onChange={(e) => onChange({ headline: e.target.value })}
        placeholder="Brief description of yourself or your company"
        rows={3}
      />
    </div>
  );
}


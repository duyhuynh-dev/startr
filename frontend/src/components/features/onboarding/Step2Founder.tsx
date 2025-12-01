/**
 * Onboarding Step 2: Founder-specific information
 */

'use client';

import { Input } from '@/components/ui';

interface Step2FounderData {
  companyName?: string;
  companyUrl?: string;
  revenueRunRate?: number;
  teamSize?: number;
  runwayMonths?: number;
  focusMarkets?: string[];
}

interface Step2FounderProps {
  data: Step2FounderData;
  onChange: (data: Partial<Step2FounderData>) => void;
}

export function OnboardingStep2Founder({ data, onChange }: Step2FounderProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Founder Information</h2>

      <Input
        label="Company Name"
        value={data.companyName || ''}
        onChange={(e) => onChange({ companyName: e.target.value })}
        placeholder="StartupCo"
        required
      />

      <Input
        label="Company Website"
        type="url"
        value={data.companyUrl || ''}
        onChange={(e) => onChange({ companyUrl: e.target.value })}
        placeholder="https://startupco.com"
      />

      <Input
        label="Monthly Revenue Run Rate ($)"
        type="number"
        value={data.revenueRunRate || ''}
        onChange={(e) => onChange({ revenueRunRate: parseFloat(e.target.value) || undefined })}
        placeholder="10000"
        helperText="Monthly recurring revenue"
      />

      <Input
        label="Team Size"
        type="number"
        value={data.teamSize || ''}
        onChange={(e) => onChange({ teamSize: parseInt(e.target.value) || undefined })}
        placeholder="5"
      />

      <Input
        label="Runway (months)"
        type="number"
        value={data.runwayMonths || ''}
        onChange={(e) => onChange({ runwayMonths: parseInt(e.target.value) || undefined })}
        placeholder="18"
        helperText="How many months of cash runway do you have?"
      />

      <Input
        label="Focus Markets (comma-separated)"
        value={data.focusMarkets?.join(', ') || ''}
        onChange={(e) => {
          const markets = e.target.value.split(',').map((m) => m.trim()).filter(Boolean);
          onChange({ focusMarkets: markets });
        }}
        placeholder="B2B SaaS, Enterprise, Healthcare"
        helperText="Enter target markets separated by commas"
      />
    </div>
  );
}


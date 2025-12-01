/**
 * Onboarding Step 2: Investor-specific information
 */

'use client';

import { Input, Select, Checkbox } from '@/components/ui';

interface Step2InvestorData {
  firm?: string;
  checkSizeMin?: number;
  checkSizeMax?: number;
  focusSectors?: string[];
  focusStages?: string[];
  accreditationNote?: string;
}

interface Step2InvestorProps {
  data: Step2InvestorData;
  onChange: (data: Partial<Step2InvestorData>) => void;
}

const SECTORS = [
  'AI/ML',
  'SaaS',
  'Fintech',
  'Healthcare',
  'EdTech',
  'E-commerce',
  'Biotech',
  'Enterprise Software',
  'Consumer',
  'Hardware',
  'Other',
];

const STAGES = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Growth',
];

export function OnboardingStep2Investor({ data, onChange }: Step2InvestorProps) {
  const handleSectorToggle = (sector: string) => {
    const current = data.focusSectors || [];
    const updated = current.includes(sector)
      ? current.filter((s) => s !== sector)
      : [...current, sector];
    onChange({ focusSectors: updated });
  };

  const handleStageToggle = (stage: string) => {
    const current = data.focusStages || [];
    const updated = current.includes(stage)
      ? current.filter((s) => s !== stage)
      : [...current, stage];
    onChange({ focusStages: updated });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Investor Information</h2>

      <Input
        label="Firm Name"
        value={data.firm || ''}
        onChange={(e) => onChange({ firm: e.target.value })}
        placeholder="ABC Ventures"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Min Check Size ($)"
          type="number"
          value={data.checkSizeMin || ''}
          onChange={(e) => onChange({ checkSizeMin: parseInt(e.target.value) || undefined })}
          placeholder="50000"
        />

        <Input
          label="Max Check Size ($)"
          type="number"
          value={data.checkSizeMax || ''}
          onChange={(e) => onChange({ checkSizeMax: parseInt(e.target.value) || undefined })}
          placeholder="500000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-100 mb-2">
          Focus Sectors
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SECTORS.map((sector) => (
            <Checkbox
              key={sector}
              label={sector}
              checked={data.focusSectors?.includes(sector) || false}
              onChange={() => handleSectorToggle(sector)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-100 mb-2">
          Focus Stages
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map((stage) => (
            <Checkbox
              key={stage}
              label={stage}
              checked={data.focusStages?.includes(stage) || false}
              onChange={() => handleStageToggle(stage)}
            />
          ))}
        </div>
      </div>

      <Input
        label="Accreditation Note (Optional)"
        value={data.accreditationNote || ''}
        onChange={(e) => onChange({ accreditationNote: e.target.value })}
        placeholder="Accredited investor status"
      />
    </div>
  );
}


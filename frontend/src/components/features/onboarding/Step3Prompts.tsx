/**
 * Onboarding Step 3: Answer prompt templates
 */

'use client';

import { useEffect, useState } from 'react';
import { Textarea } from '@/components/ui';
import { promptsApi } from '@/lib/api/prompts';
import type { PromptTemplate } from '@/lib/api/prompts';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Step3Data {
  prompts?: Array<{ content: string; template_id: string }>;
}

interface Step3Props {
  role: 'investor' | 'founder';
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
}

export function OnboardingStep3({ role, data, onChange }: Step3Props) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const fetched = await promptsApi.getTemplates({ role, is_active: true });
        // Get first 3 templates
        const selected = fetched.slice(0, 3);
        setTemplates(selected);
        
        // Initialize answers
        const initial: Record<string, string> = {};
        selected.forEach((t) => {
          initial[t.id] = '';
        });
        setAnswers(initial);
      } catch (error) {
        console.error('Failed to load prompt templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [role]);

  const handleAnswerChange = (templateId: string, content: string) => {
    const updated = { ...answers, [templateId]: content };
    setAnswers(updated);

    // Update prompts array - use template_id for now, will transform to prompt_id on submit
    const prompts = Object.entries(updated)
      .filter(([_, answer]) => answer.trim())
      .map(([templateId, content]) => ({
        template_id: templateId, // Keep as template_id here, transform on submit
        content: content.trim(),
      }));
    
    onChange({ prompts });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Answer a Few Questions</h2>
      <p className="text-slate-100 mb-6">
        Help others get to know you better by answering these prompts.
      </p>

      {templates.length === 0 ? (
        <p className="text-slate-100">No prompts available. You can skip this step.</p>
      ) : (
        templates.map((template) => (
          <div key={template.id}>
            <Textarea
              label={template.text}
              value={answers[template.id] || ''}
              onChange={(e) => handleAnswerChange(template.id, e.target.value)}
              placeholder="Your answer..."
              rows={4}
            />
          </div>
        ))
      )}
    </div>
  );
}


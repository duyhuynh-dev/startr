/**
 * Due Diligence Sidebar - Displays diligence summary for a profile
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { diligenceApi, type DiligenceSummary, type Metric, type RiskFlag, type ExternalData } from '@/lib/api/diligence';
import { LoadingSpinner } from '@/components/ui';

interface DiligenceSidebarProps {
  profileId: string;
  profileRole: 'founder' | 'investor';
  isOpen: boolean;
  onClose: () => void;
}

export function DiligenceSidebar({ profileId, profileRole, isOpen, onClose }: DiligenceSidebarProps) {
  const [summary, setSummary] = useState<DiligenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && profileId) {
      loadDiligence();
    }
  }, [isOpen, profileId]);

  const loadDiligence = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await diligenceApi.getSummary(profileId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diligence data');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 75) return 'from-emerald-500 to-emerald-600';
    if (score >= 50) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 35) return 'Needs Review';
    return 'High Risk';
  };

  const getSeverityStyle = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'medium':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
      default:
        return 'bg-slate-500/20 border-slate-500/50 text-slate-300';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Due Diligence</h2>
                <p className="text-xs text-slate-400">
                  {profileRole === 'founder' ? 'Startup Analysis' : 'Investor Profile'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={loadDiligence}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : summary ? (
                <div className="space-y-6">
                  {/* Score Card */}
                  <motion.div
                    className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-slate-400">Diligence Score</span>
                      <span className={`text-sm font-medium ${getScoreColor(summary.score)}`}>
                        {getScoreLabel(summary.score)}
                      </span>
                    </div>
                    
                    {/* Score Circle */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-32 h-32">
                        {/* Background circle */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-slate-700"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#scoreGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(summary.score / 100) * 352} 352`}
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" className={`${summary.score >= 75 ? 'stop-color-emerald-500' : summary.score >= 50 ? 'stop-color-amber-500' : 'stop-color-red-500'}`} stopColor={summary.score >= 75 ? '#10b981' : summary.score >= 50 ? '#f59e0b' : '#ef4444'} />
                              <stop offset="100%" className={`${summary.score >= 75 ? 'stop-color-emerald-600' : summary.score >= 50 ? 'stop-color-amber-600' : 'stop-color-red-600'}`} stopColor={summary.score >= 75 ? '#059669' : summary.score >= 50 ? '#d97706' : '#dc2626'} />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* Score number */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-4xl font-bold ${getScoreColor(summary.score)}`}>
                            {Math.round(summary.score)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score breakdown hint */}
                    <p className="text-xs text-slate-500 text-center">
                      Based on {summary.metrics.length} metrics and {summary.risks.length} risk factors
                    </p>
                  </motion.div>

                  {/* Metrics */}
                  {summary.metrics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                        Key Metrics
                      </h3>
                      <div className="space-y-2">
                        {summary.metrics.map((metric, idx) => (
                          <MetricRow key={idx} metric={metric} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Risk Flags */}
                  {summary.risks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h3 className="text-sm font-semibold text-slate-300 tracking-wide mb-3">
                        Risk flags ({summary.risks.length})
                      </h3>
                      <div className="space-y-2">
                        {summary.risks.map((risk, idx) => (
                          <RiskRow
                            key={idx}
                            risk={risk}
                            getSeverityStyle={getSeverityStyle}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Strengths (what's good) */}
                  {(summary.strengths ?? []).length > 0 && (
                    <motion.div
                      className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.32 }}
                    >
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {(summary.strengths ?? []).map((s, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-emerald-400 shrink-0">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Concerns (what's bad / risky) */}
                  {(summary.concerns ?? []).length > 0 && (
                    <motion.div
                      className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                    >
                      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
                        Concerns
                      </h3>
                      <ul className="space-y-2">
                        {(summary.concerns ?? []).map((c, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-amber-400 shrink-0">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* External Data Sources */}
                  {summary.external_data && Object.keys(summary.external_data).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                        External Data
                      </h3>
                      <ExternalDataSection data={summary.external_data} />
                    </motion.div>
                  )}

                  {/* Narrative */}
                  {summary.narrative && (
                    <motion.div
                      className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">AI Summary</h3>
                      <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">{summary.narrative}</p>
                    </motion.div>
                  )}

                  {/* Sources Used */}
                  {summary.sources_used && summary.sources_used.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(summary.sources_used ?? []).map((source) => (
                        <span
                          key={source}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                          title={source === 'hunter' ? 'Hunter.io – email verification service' : undefined}
                        >
                          {source === 'hunter' ? 'Hunter.io (email)' : source === 'apollo' ? 'Apollo (company)' : source === 'openai' ? 'OpenAI' : source}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Last updated */}
                  <p className="text-xs text-slate-500 text-center">
                    Generated {new Date(summary.generated_at).toLocaleDateString()} at{' '}
                    {new Date(summary.generated_at).toLocaleTimeString()}
                  </p>

                  {/* Refresh button */}
                  <button
                    onClick={() => {
                      setSummary(null);
                      diligenceApi.getSummary(profileId, true).then(setSummary).catch((err) => setError(err.message));
                    }}
                    className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MetricRow({ metric }: { metric: Metric }) {
  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
      <span className="text-sm text-slate-300">{metric.name}</span>
      <span className="text-sm font-medium text-slate-100">
        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
      </span>
    </div>
  );
}

function RiskRow({
  risk,
  getSeverityStyle,
}: {
  risk: RiskFlag;
  getSeverityStyle: (severity: 'low' | 'medium' | 'high') => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border px-4 py-3 cursor-pointer transition-all ${getSeverityStyle(risk.severity)}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {risk.code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
        <span className="text-xs opacity-75">
          {typeof risk.severity === 'string'
            ? risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1).toLowerCase()
            : risk.severity}
        </span>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.p
            className="text-xs mt-2 opacity-80"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {risk.description}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExternalDataSection({ data }: { data: ExternalData }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-2">
      {/* Apollo - Company Data */}
      {data.apollo && (
        <div
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('apollo')}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">Company Data</span>
              <span className="text-xs text-slate-500">(Apollo)</span>
            </div>
            <span className="text-xs text-slate-500">{expandedSection === 'apollo' ? 'Collapse' : 'Expand'}</span>
          </div>
          <AnimatePresence>
            {expandedSection === 'apollo' && (
              <motion.div
                className="px-4 pb-3 space-y-2 border-t border-slate-700/50"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
                  {data.apollo.industry && (
                    <div>
                      <span className="text-slate-500">Industry:</span>
                      <span className="ml-1 text-slate-300">{data.apollo.industry}</span>
                    </div>
                  )}
                  {data.apollo.employee_count && (
                    <div>
                      <span className="text-slate-500">Employees:</span>
                      <span className="ml-1 text-slate-300">{data.apollo.employee_count.toLocaleString()}</span>
                    </div>
                  )}
                  {data.apollo.total_funding && (
                    <div>
                      <span className="text-slate-500">Funding:</span>
                      <span className="ml-1 text-emerald-400">${(data.apollo.total_funding / 1000000).toFixed(1)}M</span>
                    </div>
                  )}
                  {data.apollo.latest_funding_round && (
                    <div>
                      <span className="text-slate-500">Stage:</span>
                      <span className="ml-1 text-slate-300">{data.apollo.latest_funding_round}</span>
                    </div>
                  )}
                  {data.apollo.location && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Location:</span>
                      <span className="ml-1 text-slate-300">{data.apollo.location}</span>
                    </div>
                  )}
                </div>
                {data.apollo.technologies && data.apollo.technologies.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs text-slate-500">Tech Stack:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.apollo.technologies.slice(0, 5).map((tech) => (
                        <span key={tech} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Email Verification */}
      {data.email_verification && (
        <div
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('email')}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">Email Verification</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                data.email_verification.result === 'deliverable' 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : data.email_verification.result === 'risky'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {data.email_verification.result}
              </span>
            </div>
            <span className="text-xs text-slate-500">{expandedSection === 'email' ? 'Collapse' : 'Expand'}</span>
          </div>
          <AnimatePresence>
            {expandedSection === 'email' && (
              <motion.div
                className="px-4 pb-3 border-t border-slate-700/50"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="pt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Confidence Score:</span>
                    <span className="text-slate-300">{data.email_verification.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disposable:</span>
                    <span className={data.email_verification.disposable ? 'text-red-400' : 'text-emerald-400'}>
                      {data.email_verification.disposable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Webmail:</span>
                    <span className="text-slate-300">{data.email_verification.webmail ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI Analysis */}
      {data.ai_analysis && (
        <div
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('ai')}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">AI Analysis</span>
              <span className="text-xs text-slate-500">(GPT-4)</span>
            </div>
            <span className="text-xs text-slate-500">{expandedSection === 'ai' ? 'Collapse' : 'Expand'}</span>
          </div>
          <AnimatePresence>
            {expandedSection === 'ai' && (
              <motion.div
                className="px-4 pb-3 border-t border-slate-700/50"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="pt-3 space-y-3 text-xs">
                  {data.ai_analysis.summary && (
                    <p className="text-slate-300">{data.ai_analysis.summary}</p>
                  )}
                  {data.ai_analysis.business_model && (
                    <div>
                      <span className="text-slate-500">Business Model:</span>
                      <span className="ml-1 text-slate-300">{data.ai_analysis.business_model}</span>
                    </div>
                  )}
                  {data.ai_analysis.strengths && data.ai_analysis.strengths.length > 0 && (
                    <div>
                      <span className="text-slate-500 block mb-1">Strengths:</span>
                      <ul className="list-disc list-inside text-emerald-300 space-y-0.5">
                        {data.ai_analysis.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.ai_analysis.risks && data.ai_analysis.risks.length > 0 && (
                    <div>
                      <span className="text-slate-500 block mb-1">Risks:</span>
                      <ul className="list-disc list-inside text-amber-300 space-y-0.5">
                        {data.ai_analysis.risks.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.ai_analysis.competitors && data.ai_analysis.competitors.length > 0 && (
                    <div>
                      <span className="text-slate-500">Competitors:</span>
                      <span className="ml-1 text-slate-300">{data.ai_analysis.competitors.join(', ')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* PDL Company Data */}
      {data.pdl && (
        <div
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('pdl')}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium text-slate-200">Company Intel</span>
              <span className="text-xs text-slate-500">(PDL)</span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'pdl' ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <AnimatePresence>
            {expandedSection === 'pdl' && (
              <motion.div
                className="px-4 pb-3 border-t border-slate-700/50"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
                  {data.pdl.company_type && (
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <span className="ml-1 text-slate-300">{data.pdl.company_type}</span>
                    </div>
                  )}
                  {data.pdl.employee_count && (
                    <div>
                      <span className="text-slate-500">Employees:</span>
                      <span className="ml-1 text-slate-300">{data.pdl.employee_count.toLocaleString()}</span>
                    </div>
                  )}
                  {data.pdl.total_funding && (
                    <div>
                      <span className="text-slate-500">Funding:</span>
                      <span className="ml-1 text-emerald-400">${(data.pdl.total_funding / 1000000).toFixed(1)}M</span>
                    </div>
                  )}
                  {data.pdl.latest_funding_round && (
                    <div>
                      <span className="text-slate-500">Stage:</span>
                      <span className="ml-1 text-slate-300">{data.pdl.latest_funding_round}</span>
                    </div>
                  )}
                  {data.pdl.location && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Location:</span>
                      <span className="ml-1 text-slate-300">{data.pdl.location}</span>
                    </div>
                  )}
                </div>
                {data.pdl.tags && data.pdl.tags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs text-slate-500">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.pdl.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.pdl.linkedin_url && (
                  <a
                    href={data.pdl.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on LinkedIn →
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Founder Profile */}
      {data.founder && (
        <div
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('founder')}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span className="text-sm font-medium text-slate-200">Founder Profile</span>
              {data.founder.full_name && (
                <span className="text-xs text-slate-500">{data.founder.full_name}</span>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'founder' ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <AnimatePresence>
            {expandedSection === 'founder' && (
              <motion.div
                className="px-4 pb-3 border-t border-slate-700/50"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="pt-3 space-y-3 text-xs">
                  {data.founder.headline && (
                    <p className="text-slate-300">{data.founder.headline}</p>
                  )}
                  
                  {/* Experience */}
                  {data.founder.experience && data.founder.experience.length > 0 && (
                    <div>
                      <span className="text-slate-500 block mb-1">Experience:</span>
                      <div className="space-y-1">
                        {data.founder.experience.map((exp, i) => (
                          <div key={i} className="text-slate-300">
                            <span className="font-medium">{exp.title}</span>
                            {exp.company && <span className="text-slate-500"> at {exp.company}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Education */}
                  {data.founder.education && data.founder.education.length > 0 && (
                    <div>
                      <span className="text-slate-500 block mb-1">Education:</span>
                      <div className="space-y-1">
                        {data.founder.education.map((edu, i) => (
                          <div key={i} className="text-slate-300">
                            {edu.school}
                            {edu.degree && <span className="text-slate-500"> • {edu.degree}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Skills */}
                  {data.founder.skills && data.founder.skills.length > 0 && (
                    <div>
                      <span className="text-slate-500 block mb-1">Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {data.founder.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {data.founder.linkedin_url && (
                    <a
                      href={data.founder.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View LinkedIn Profile →
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default DiligenceSidebar;

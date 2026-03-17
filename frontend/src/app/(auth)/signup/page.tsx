/**
 * Signup page – Contra-inspired clean split layout
 * Left: form (Google + email fields)
 * Right: testimonial / brand messaging
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { Turnstile } from '@/components/ui/Turnstile';

type Role = 'investor' | 'founder';

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'role'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const redirectUri = `${window.location.origin}/callback/google`;
      const { authorization_url } = await authApi.getGoogleAuthUrl(redirectUri);
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Google sign-in.');
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStep('role');
  };

  const handleSignup = async () => {
    if (!selectedRole) {
      setError('Please select a role.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await signup(formData.email, formData.password, selectedRole, formData.fullName, turnstileToken || undefined);
      // Require email verification as part of signup, then continue onboarding.
      const next = `/onboarding?role=${encodeURIComponent(selectedRole)}`;
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#060611' }}>
      {/* Left panel – form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 max-w-[600px]">
        {/* Logo */}
        <Link href="/" className="text-2xl font-semibold tracking-tight text-white mb-12 inline-block w-fit">
          Startr
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {step === 'form' ? (
            <>
              <h1 className="text-3xl font-semibold text-white mb-2">Sign up to Startr</h1>
              <p className="text-white/40 text-sm mb-8">
                Connect with the right investors and founders.
              </p>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30 uppercase tracking-wider font-medium">or sign up with</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleContinue} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.fullName.split(' ')[0] || ''}
                    onChange={(e) => {
                      const last = formData.fullName.split(' ').slice(1).join(' ');
                      setFormData({ ...formData, fullName: `${e.target.value}${last ? ' ' + last : ''}` });
                    }}
                    placeholder="First name"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                  />
                  <input
                    type="text"
                    value={formData.fullName.split(' ').slice(1).join(' ') || ''}
                    onChange={(e) => {
                      const first = formData.fullName.split(' ')[0] || '';
                      setFormData({ ...formData, fullName: `${first}${e.target.value ? ' ' + e.target.value : ''}` });
                    }}
                    placeholder="Last name"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                  />
                </div>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@work-email.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                />

                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                />

                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
                />

                <Turnstile
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                  onReady={(enabled) => setTurnstileEnabled(enabled)}
                  className="flex justify-center my-2"
                />

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!formData.fullName.trim() || !formData.email.trim() || !formData.password || (turnstileEnabled && !turnstileToken)}
                >
                  Continue
                </button>
              </form>

              <p className="text-sm text-white/40 mt-6 text-center">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-white hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* Role selection step */
            <>
              <button
                type="button"
                onClick={() => { setStep('form'); setError(''); }}
                className="text-sm text-white/40 hover:text-white/70 mb-6 flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <h1 className="text-3xl font-semibold text-white mb-2">What brings you here?</h1>
              <p className="text-white/40 text-sm mb-8">Select your role to get started.</p>

              <div className="space-y-3 mb-8">
                {([
                  { value: 'founder' as Role, title: 'Founder', desc: 'I\'m building a startup and looking for investors.' },
                  { value: 'investor' as Role, title: 'Investor', desc: 'I invest in startups and want to discover founders.' },
                ] as const).map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedRole === role.value
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <p className="font-medium text-white text-sm">{role.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{role.desc}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <button
                type="button"
                onClick={handleSignup}
                disabled={!selectedRole || isLoading}
                className="w-full rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </>
          )}
        </motion.div>
      </div>

      {/* Right panel – branding / social proof */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white/3 border-l border-white/5 px-12">
        <motion.div
          className="max-w-md"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mb-8">
            <div className="w-1 h-10 bg-amber-400 rounded-full mb-6" />
            <p className="text-xl text-white/70 leading-relaxed font-light">
              Startr is the first platform designed for founders and investors to find each other based on real fit — not cold outreach.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-[#060611] text-sm font-semibold">
              S
            </div>
            <div>
              <p className="text-sm font-medium text-white">Startr Team</p>
              <p className="text-xs text-white/40">Building the future of fundraising</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-4">
              Trusted by founders and investors
            </p>
            <div className="flex items-center gap-6 text-white/30 text-sm font-medium">
              <span>YC Founders</span>
              <span className="text-white/20">·</span>
              <span>Angel Investors</span>
              <span className="text-white/20">·</span>
              <span>VCs</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

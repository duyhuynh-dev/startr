/**
 * Email verification page – 6-digit OTP code input
 * Clean light theme matching signup/login
 */

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { verificationApi } from '@/lib/api/verification';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailParam) {
      handleRequestOTP(emailParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestOTP = async (overrideEmail?: string) => {
    const targetEmail = overrideEmail || email;
    if (!targetEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    setIsRequestingOTP(true);
    setError('');
    setSuccess('');

    try {
      await verificationApi.requestEmailOTP(targetEmail);
      setOtpSent(true);
      setCountdown(60);
      setSuccess('Verification code sent! Check your inbox.');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === 6 && newDigits.every((d) => d !== '')) {
      handleVerifyOTP(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();

      if (pasted.length === 6) {
        handleVerifyOTP(pasted);
      }
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const verifyCode = code || otpDigits.join('');
    if (verifyCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await verificationApi.verifyEmailOTP(email, verifyCode);
      setSuccess('Email verified! Redirecting...');
      setTimeout(() => router.push('/onboarding'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#fafafa' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-900 mb-10 inline-block">
          Startr
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Verify your email</h1>
          <p className="text-slate-500 text-sm mb-8">
            {otpSent
              ? <>We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span></>
              : 'Enter your email to receive a verification code.'}
          </p>

          {!otpSent ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@work-email.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="button"
                onClick={() => handleRequestOTP()}
                disabled={isRequestingOTP || !email.trim()}
                className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRequestingOTP ? 'Sending...' : 'Send verification code'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* OTP input boxes */}
              <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isLoading}
                    className="w-12 h-14 rounded-xl border border-slate-200 bg-white text-center text-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors disabled:opacity-50"
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-emerald-600 text-sm text-center">{success}</p>}

              <button
                type="button"
                onClick={() => handleVerifyOTP()}
                disabled={isLoading || otpDigits.some((d) => d === '')}
                className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify email'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => handleRequestOTP()}
                  disabled={countdown > 0 || isRequestingOTP}
                  className="text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Change email
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <p className="text-sm text-slate-400 mt-8 text-center">
          <Link href="/login" className="hover:text-slate-600 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafafa' }}>
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

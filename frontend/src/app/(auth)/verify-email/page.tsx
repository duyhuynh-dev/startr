/**
 * Email Verification Page with OTP Input
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { verificationApi } from '@/lib/api/verification';
import { fadeIn } from '@/lib/animations';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  
  const [email, setEmail] = useState(emailParam || '');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-send OTP if email is provided
  useEffect(() => {
    if (emailParam && !otpSent) {
      handleRequestOTP();
    }
  }, [emailParam]);

  const handleRequestOTP = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsRequestingOTP(true);
    setError('');

    try {
      const result = await verificationApi.requestEmailOTP(email);
      setSuccess(result.message);
      setOtpSent(true);
      setCountdown(60); // 60 second cooldown
      // Focus first OTP input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newDigits.every(d => d) && newDigits.join('').length === 6) {
      handleVerifyOTP(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setOtpDigits(newDigits);
      handleVerifyOTP(pastedData);
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const otpCode = code || otpDigits.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verificationApi.verifyEmailOTP(email, otpCode);
      setSuccess('Email verified successfully! Redirecting...');
      
      // Redirect to profile or dashboard
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      // Clear OTP on error
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <span className="text-3xl mb-2 block">📧</span>
              Verify Your Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded text-sm">
                {success}
              </div>
            )}

            {!otpSent ? (
              // Step 1: Enter email and request OTP
              <div className="space-y-4">
                <p className="text-slate-400 text-center text-sm">
                  Enter your email address to receive a verification code.
                </p>
                
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isRequestingOTP}
                />

                <Button
                  variant="primary"
                  onClick={handleRequestOTP}
                  disabled={isRequestingOTP || !email}
                  isLoading={isRequestingOTP}
                  className="w-full"
                >
                  Send Verification Code
                </Button>
              </div>
            ) : (
              // Step 2: Enter OTP
              <div className="space-y-6">
                <p className="text-slate-400 text-center text-sm">
                  We sent a 6-digit code to <span className="text-amber-400 font-medium">{email}</span>
                </p>

                {/* OTP Input */}
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-colors disabled:opacity-50"
                      maxLength={1}
                    />
                  ))}
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleVerifyOTP()}
                  disabled={isLoading || otpDigits.some(d => !d)}
                  isLoading={isLoading}
                  className="w-full"
                >
                  Verify Email
                </Button>

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-slate-400 text-sm">
                      Resend code in <span className="text-amber-400">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      disabled={isRequestingOTP}
                      className="text-sm text-amber-400 hover:text-amber-300 underline disabled:opacity-50"
                    >
                      {isRequestingOTP ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>

                {/* Change email */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpDigits(['', '', '', '', '', '']);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-sm text-slate-400 hover:text-slate-300"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                ← Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

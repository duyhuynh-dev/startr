/**
 * Email Verification Page with OTP Input - Redesigned with elegant styling
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { verificationApi } from '@/lib/api/verification';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsRequestingOTP(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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
      
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #0a0b14 0%, #0f1419 50%, #0a0b14 100%)' }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)',
            top: '-15%',
            right: '-5%',
          }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            bottom: '-10%',
            left: '-5%',
          }}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Decorative circles */}
      <motion.div 
        className="absolute top-20 left-20 w-32 h-32 border border-amber-500/10 rounded-full hidden md:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute bottom-20 right-20 w-24 h-24 border border-blue-500/10 rounded-full hidden md:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Floating dots */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-400/30 rounded-full hidden md:block"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 18}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Main content */}
      <motion.div 
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo/Brand */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center font-bold text-sm text-[#0a0b14]">
              S
            </div>
            <span className="text-xl font-semibold tracking-tight bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
              Startr
            </span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div 
          className="backdrop-blur-xl rounded-2xl p-8 border border-white/10"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <motion.div 
              className="flex items-center justify-center gap-3 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="w-8 h-[2px] bg-gradient-to-r from-transparent to-amber-400/60" />
              <span className="text-amber-400/80 text-xs tracking-widest uppercase">Verification</span>
              <div className="w-8 h-[2px] bg-gradient-to-l from-transparent to-amber-400/60" />
            </motion.div>
            <h2 className="text-2xl font-semibold text-white">Verify Your Email</h2>
          </div>

          {error && (
            <motion.div 
              className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </motion.div>
          )}

          {!otpSent ? (
            // Step 1: Enter email and request OTP
            <div className="space-y-5">
              <p className="text-slate-400 text-center text-sm">
                Enter your email address to receive a verification code.
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm text-slate-400 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isRequestingOTP}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                />
              </div>

              <motion.button
                onClick={handleRequestOTP}
                disabled={isRequestingOTP || !email}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-[#0a0b14] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isRequestingOTP ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </span>
              </motion.button>
            </div>
          ) : (
            // Step 2: Enter OTP
            <div className="space-y-6">
              <p className="text-slate-400 text-center text-sm">
                We sent a 6-digit code to{' '}
                <span className="text-amber-400 font-medium">{email}</span>
              </p>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {otpDigits.map((digit, index) => (
                  <motion.input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl text-white focus:outline-none transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: digit ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: digit ? '2px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: digit ? '0 0 20px rgba(251, 191, 36, 0.1)' : 'none',
                    }}
                    maxLength={1}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 * index, type: "spring" }}
                  />
                ))}
              </div>

              <motion.button
                onClick={() => handleVerifyOTP()}
                disabled={isLoading || otpDigits.some(d => !d)}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-[#0a0b14] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </span>
              </motion.button>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-slate-400 text-sm">
                    Resend code in{' '}
                    <span className="text-amber-400 font-medium">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={isRequestingOTP}
                    className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors disabled:opacity-50"
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
                  className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Back to login */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link 
            href="/login" 
            className="text-slate-500 hover:text-slate-400 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-180">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to login
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

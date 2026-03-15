'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#060611' }}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/" className="text-2xl font-semibold tracking-tight text-white mb-10 inline-block">
          Startr
        </Link>

        {sent ? (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Check your email</h1>
            <p className="text-white/40 text-sm mb-6">
              If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold px-6 py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Reset your password</h1>
            <p className="text-white/40 text-sm mb-6">
              Enter the email address associated with your account and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@work-email.com"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="text-sm text-white/40 mt-6 text-center">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-white hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

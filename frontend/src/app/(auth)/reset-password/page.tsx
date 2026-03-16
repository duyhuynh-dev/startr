'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api/auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Invalid link</h1>
        <p className="text-white/40 text-sm mb-6">This password reset link is missing or expired.</p>
        <Link href="/forgot-password" className="font-medium text-white hover:underline text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Password updated</h1>
        <p className="text-white/40 text-sm mb-6">Your password has been reset. You can now sign in.</p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold px-6 py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-2">Set a new password</h1>
      <p className="text-white/40 text-sm mb-6">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          disabled={isLoading}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          required
          disabled={isLoading}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading || !password || !confirm}
          className="w-full rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold py-3 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Updating...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="animate-spin w-6 h-6 border-2 border-white/10 border-t-amber-400 rounded-full mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}

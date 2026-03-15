'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface MatchModalProps {
  isOpen: boolean;
  matchName: string;
  matchAvatar?: string;
  onClose: () => void;
}

const confettiColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function ConfettiPiece({ index }: { index: number }) {
  const color = confettiColors[index % confettiColors.length];
  const left = `${10 + Math.random() * 80}%`;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1;
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 6;

  return (
    <motion.div
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 0 }}
      animate={{ y: 400, opacity: 0, rotate: rotation + 360, scale: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left,
        top: '10%',
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
      }}
    />
  );
}

export function MatchModal({ isOpen, matchName, matchAvatar, onClose }: MatchModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const handleMessage = useCallback(() => {
    onClose();
    router.push('/messages');
  }, [onClose, router]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-10000 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 bg-[#0d0e1a] border border-white/10 rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl shadow-black/20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5, times: [0, 0.6, 1] }}
              className="w-20 h-20 mx-auto mb-5 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200"
            >
              {matchAvatar ? (
                <img src={matchAvatar} alt="" className="w-full h-full rounded-full object-cover border-4 border-white" />
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-1"
            >
              It&apos;s a Match!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/40 text-sm mb-6"
            >
              You and <span className="font-semibold text-white/70">{matchName}</span> both expressed interest
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 transition-colors"
              >
                Keep browsing
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 px-4 py-3 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors"
              >
                Send a message
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

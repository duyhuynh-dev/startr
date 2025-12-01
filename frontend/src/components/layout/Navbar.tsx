/**
 * Navigation Bar Component with dark theme
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/discover', label: 'Discover' },
    { href: '/likes', label: 'Likes' },
    { href: '/messages', label: 'Messages' },
    { href: '/profile', label: 'Profile' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <motion.nav
      className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/discover" className="text-xl font-bold text-amber-500 hover:text-amber-400 transition-colors">
              VC Matcher
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <Link
                  href={link.href}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-amber-500'
                      : 'text-slate-100 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full"
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* User Menu */}
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {user && (
              <span className="text-sm text-slate-100 hidden sm:inline">
                {user.email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        className="md:hidden border-t border-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.href)
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'text-slate-100 hover:text-amber-400 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.nav>
  );
}

/**
 * Home Page - Show landing page or redirect to dashboard based on auth status
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if authenticated - show landing page for guests
    if (!isLoading && isAuthenticated) {
      router.push("/discover");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#fafafa' }}>
        <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Fallback loading state during redirect
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#fafafa' }}>
        <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full" />
      </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <WhyWeBuiltThis />
      <TheVisionSection />
      <HowItFeelsSection />
      <JoinTheMovement />
      <Footer />
    </div>
  );
}

function Navigation() {
  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 bg-[#0a0b14]/90 backdrop-blur-lg border-b border-amber-500/10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center font-bold text-sm text-[#0a0b14]">
            S
          </div>
          <span className="text-xl font-semibold tracking-tight bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Startr</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#the-problem" className="hover:text-amber-300 transition-colors">The Problem</a>
          <a href="#our-vision" className="hover:text-amber-300 transition-colors">Our Vision</a>
          <a href="#how-it-feels" className="hover:text-amber-300 transition-colors">How It Feels</a>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm text-white/60 hover:text-amber-300 transition-colors"
          >
            Log in
          </Link>
          <Link 
            href="/signup"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a0b14] text-sm font-semibold rounded-full hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-transparent to-blue-950/30" />
      
      {/* Organic floating shapes */}
      <motion.div 
        className="absolute top-20 right-[10%] w-72 h-72 border border-amber-500/20 rounded-full"
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-40 right-[15%] w-4 h-4 bg-amber-400/60 rounded-full"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-32 left-[10%] w-48 h-48 border border-slate-600/30 rounded-full"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-40 left-[5%] w-2 h-2 bg-amber-400/40 rounded-full"
      />
      <motion.div 
        className="absolute top-1/3 left-[20%] w-1 h-1 bg-amber-400/60 rounded-full"
      />
      
      {/* Curved decorative line */}
      <svg className="absolute bottom-20 right-10 w-40 h-40 text-amber-500/20 hidden lg:block" viewBox="0 0 100 100">
        <path d="M10 50 Q 50 10, 90 50 T 90 90" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
      
      <motion.div 
        className="relative z-10 max-w-6xl mx-auto px-6"
        style={{ y, opacity }}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Main content */}
          <div>
            <motion.div 
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="w-12 h-[2px] bg-gradient-to-r from-amber-400 to-transparent" />
              <span className="text-amber-400 text-sm tracking-widest uppercase">For founders & investors</span>
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Partnerships that
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                matter.
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-slate-400 max-w-lg mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Forget the noise. Startr connects you with people who 
              genuinely align with your vision—whether you're raising 
              or investing.
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Link 
                href="/signup"
                className="group px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a0b14] font-semibold rounded-full hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
              >
                Get started free
              </Link>
              <Link 
                href="/login"
                className="px-8 py-4 text-slate-300 hover:text-amber-300 font-medium transition-colors"
              >
                Sign in →
              </Link>
            </motion.div>
          </div>
          
          {/* Right: Visual element */}
          <motion.div 
            className="hidden lg:flex items-center justify-center relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <div className="relative">
              {/* Abstract connection visualization */}
              <motion.div 
                className="w-64 h-64 border-2 border-amber-500/30 rounded-full flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <motion.div 
                  className="w-40 h-40 border border-amber-500/20 rounded-full flex items-center justify-center"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-amber-400 text-2xl">✦</span>
                  </div>
                </motion.div>
              </motion.div>
              
              {/* Floating labels */}
              <motion.div 
                className="absolute -top-4 right-0 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-sm text-slate-300">Founders</span>
              </motion.div>
              <motion.div 
                className="absolute -bottom-4 left-0 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <span className="text-sm text-slate-300">Investors</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      </section>
  );
}

function WhyWeBuiltThis() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="the-problem" ref={ref} className="py-32 px-6 relative overflow-hidden scroll-mt-20">
      {/* Decorative circle - far right */}
      <motion.div 
        className="absolute -right-32 top-1/4 w-64 h-64 border border-amber-500/20 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute -right-20 top-1/3 w-40 h-40 border border-amber-500/10 rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="max-w-6xl mx-auto">
        {/* Left-aligned content */}
        <motion.div 
          className="max-w-2xl"
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="flex items-center gap-3 mb-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            <div className="w-12 h-[2px] bg-gradient-to-r from-amber-400 to-transparent" />
            <span className="text-amber-400 text-sm tracking-widest uppercase">The Problem</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8">
            Raising capital shouldn't feel like 
            <span className="block text-slate-500 mt-2">shouting into the void.</span>
          </h2>
          
          <p className="text-xl text-slate-400 leading-relaxed mb-8">
            We've watched brilliant founders send hundreds of cold emails, 
            attend countless networking events, and still struggle to find 
            investors who truly understand their vision.
          </p>
          
          <p className="text-xl text-slate-400 leading-relaxed">
            Meanwhile, investors wade through thousands of pitches, 
            searching for that rare founder who fits their thesis perfectly.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function TheVisionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="our-vision" ref={ref} className="py-32 px-6 relative overflow-hidden scroll-mt-20">
      {/* Decorative elements - far left */}
      <motion.div 
        className="absolute -left-20 top-20 w-40 h-40 border-2 border-dashed border-amber-500/20 rounded-full"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute left-10 top-1/2 w-2 h-2 bg-amber-400 rounded-full" />
      <div className="absolute left-20 top-[55%] w-1 h-1 bg-amber-400/60 rounded-full" />
      <div className="absolute left-6 top-[60%] w-1.5 h-1.5 bg-amber-400/40 rounded-full" />
      
      <div className="max-w-6xl mx-auto">
        {/* Right-aligned content */}
        <motion.div 
          className="max-w-2xl ml-auto text-right"
          initial={{ opacity: 0, x: 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="flex items-center gap-3 mb-8 justify-end"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            <span className="text-amber-400 text-sm tracking-widest uppercase">Our Vision</span>
            <div className="w-12 h-[2px] bg-gradient-to-l from-amber-400 to-transparent" />
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8">
            What if finding the right partner was 
            <span className="block text-amber-300 mt-2">as natural as a conversation?</span>
          </h2>
          
          <p className="text-xl text-slate-400 leading-relaxed mb-8">
            We believe the best partnerships start with genuine alignment—shared 
            values, complementary expertise, and a mutual spark of excitement.
          </p>
          
          <p className="text-xl text-slate-400 leading-relaxed">
            Startr isn't about volume. It's about finding the <em className="text-amber-200 not-italic">one</em> connection 
            that changes everything.
          </p>
        </motion.div>
        
        {/* Curved line decoration */}
        <motion.svg 
          className="absolute right-1/4 bottom-10 w-32 h-32 text-amber-500/20"
          viewBox="0 0 100 100"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.5, delay: 0.5 }}
        >
          <motion.path
            d="M10 90 Q 50 10, 90 50"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="90" cy="50" r="4" fill="currentColor" />
        </motion.svg>
      </div>
    </section>
  );
}

function HowItFeelsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const principles = [
    {
      title: "Intentional, not infinite",
      description: "Every swipe matters. We show you fewer, better matches—people who actually align with what you're building or investing in.",
    },
    {
      title: "Human first, algorithm second",
      description: "Technology helps us find patterns, but the magic happens when two people genuinely connect. We optimize for conversations, not clicks.",
    },
    {
      title: "Trust is earned",
      description: "Verified profiles. Real credentials. No anonymous accounts. Everyone on Startr has skin in the game.",
    },
  ];

  return (
    <section id="how-it-feels" ref={ref} className="py-32 px-6 relative overflow-hidden bg-gradient-to-b from-transparent via-slate-900/50 to-transparent scroll-mt-20">
      {/* Center-aligned intro */}
      <div className="max-w-4xl mx-auto text-center mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block text-amber-400 text-sm tracking-widest uppercase mb-6">How it feels</span>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Built on principles,
            <br />
            <span className="text-slate-500">not just features.</span>
          </h2>
        </motion.div>
      </div>
      
      {/* Staggered layout */}
      <div className="max-w-5xl mx-auto space-y-20">
        {principles.map((principle, index) => (
          <motion.div
            key={principle.title}
            className={`flex items-start gap-12 ${index % 2 === 1 ? 'flex-row-reverse' : ''}`}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.2 }}
          >
            {/* Number indicator */}
            <div className="hidden md:flex flex-col items-center">
              <motion.div 
                className="w-16 h-16 rounded-full border-2 border-amber-500/30 flex items-center justify-center"
                whileHover={{ scale: 1.1, borderColor: 'rgba(251, 191, 36, 0.6)' }}
              >
                <span className="text-2xl font-light text-amber-400">{index + 1}</span>
              </motion.div>
              {index < principles.length - 1 && (
                <motion.div 
                  className="w-[2px] h-20 bg-gradient-to-b from-amber-500/30 to-transparent mt-4"
                  initial={{ scaleY: 0 }}
                  animate={isInView ? { scaleY: 1 } : {}}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                />
              )}
            </div>
            
            {/* Content */}
            <div className={`flex-1 ${index % 2 === 1 ? 'text-right flex flex-col items-end' : ''}`}>
              <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-white">
                {principle.title}
              </h3>
              <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                {principle.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Decorative dots */}
      <div className="absolute right-10 top-1/4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <motion.div 
            key={i}
            className="w-1 h-1 bg-amber-400/40 rounded-full"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </section>
  );
}

function JoinTheMovement() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-40 px-6 relative overflow-hidden">
      {/* Decorative circles */}
      <motion.div 
        className="absolute left-1/4 top-10 w-80 h-80 border border-amber-500/10 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute right-1/3 bottom-10 w-60 h-60 border border-amber-500/10 rounded-full"
        animate={{ scale: [1.05, 1, 1.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Floating arrow pointing to CTA */}
      <motion.div 
        className="absolute left-[15%] top-1/2 hidden lg:block"
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="60" height="24" viewBox="0 0 60 24" className="text-amber-500/40">
          <path d="M0 12 L50 12 M40 4 L52 12 L40 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
      
      <div className="max-w-4xl mx-auto relative">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.p 
            className="text-amber-400 text-lg mb-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            This is just the beginning.
          </motion.p>
          
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8">
            The next great partnership
            <br />
            <span className="text-slate-500">starts with a single</span>
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              hello.
            </span>
          </h2>
          
          <motion.p 
            className="text-xl text-slate-400 mb-16 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4 }}
          >
            Whether you're building the future or funding it, 
            your perfect match is waiting.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6 }}
          >
            <Link 
              href="/signup?role=founder"
              className="group relative px-10 py-5 overflow-hidden rounded-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 transition-transform group-hover:scale-105" />
              <span className="relative text-[#0a0b14] font-semibold text-lg flex items-center gap-2">
                I'm building something
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
            </Link>
            
            <Link 
              href="/signup?role=investor"
              className="group px-10 py-5 rounded-full border-2 border-slate-600 hover:border-amber-500/50 transition-all duration-300"
            >
              <span className="text-white font-semibold text-lg group-hover:text-amber-300 transition-colors">
                I'm investing in the future
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center font-bold text-sm text-[#0a0b14]">
              S
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Startr</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <a href="#" className="hover:text-amber-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-amber-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-amber-300 transition-colors">Contact</a>
          </div>
          
          <div className="text-sm text-slate-600">
            © 2026 Startr. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

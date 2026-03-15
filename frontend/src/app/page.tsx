"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

/* ──────────────────────────────────────────────
   COUNT UP ANIMATION
   ────────────────────────────────────────────── */

function CountUp({ end, suffix = "", prefix = "", duration = 2, decimals = 0 }: { end: number; suffix?: string; prefix?: string; duration?: number; decimals?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); return; }
      setCount(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}{suffix}
    </span>
  );
}

/* ──────────────────────────────────────────────
   ANIMATED SVG LINE GRAPH
   ────────────────────────────────────────────── */

function AnimatedLineGraph({ isInView }: { isInView: boolean }) {
  const points = [10, 25, 18, 40, 35, 55, 48, 70, 62, 82, 75, 92];
  const w = 100, h = 60;
  const px = points.map((p, i) => (i / (points.length - 1)) * w);
  const py = points.map((p) => h - (p / 100) * h);
  const linePath = px.map((x, i) => `${i === 0 ? "M" : "L"}${x},${py[i]}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 5}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#graphGrad)"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.6 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke="rgba(251,191,36,0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : {}}
        transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={px[i]}
          cy={py[i]}
          r="1.5"
          fill="#fbbf24"
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5 + i * 0.1 }}
        />
      ))}
    </svg>
  );
}

/* ──────────────────────────────────────────────
   ANIMATED PROGRESS RING
   ────────────────────────────────────────────── */

function ProgressRing({ value, label, color, delay = 0, isInView }: { value: number; label: string; color: string; delay?: number; isInView: boolean }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <motion.circle
            cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={isInView ? { strokeDashoffset: c - (value / 100) * c } : {}}
            transition={{ delay, duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{isInView ? <CountUp end={value} suffix="%" duration={1.5} /> : "0%"}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────
   LIVE ACTIVITY FEED MOCK
   ────────────────────────────────────────────── */

/* ──────────────────────────────────────────────
   ANIMATED VERIFIED BADGES
   ────────────────────────────────────────────── */

function VerifiedBadgeAnimation({ isInView }: { isInView: boolean }) {
  const badges = ["LinkedIn", "Email", "Identity"];
  return (
    <div className="flex gap-2">
      {badges.map((b, i) => (
        <motion.div
          key={b}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.8 + i * 0.2, type: "spring", stiffness: 200 }}
        >
          <motion.svg
            className="w-3 h-3 text-emerald-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ delay: 1.0 + i * 0.2, duration: 0.4 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </motion.svg>
          <span className="text-[10px] text-emerald-400/70">{b}</span>
        </motion.div>
      ))}
    </div>
  );
}

function LiveFeed({ isInView }: { isInView: boolean }) {
  const events = [
    { text: "New match: Founder ↔ Seed VC", time: "2s ago", color: "bg-amber-400" },
    { text: "Series A conversation started", time: "15s ago", color: "bg-violet-400" },
    { text: "Investor liked a Fintech profile", time: "32s ago", color: "bg-rose-400" },
    { text: "New founder joined from SF", time: "1m ago", color: "bg-emerald-400" },
  ];

  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <motion.div
          key={e.text}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.6 + i * 0.2, type: "spring", stiffness: 120 }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${e.color} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/50 truncate">{e.text}</p>
          </div>
          <span className="text-[10px] text-white/15 shrink-0">{e.time}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/discover");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060611]">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
      </div>
    );
  }

  return <LandingPage />;
}

/* ──────────────────────────────────────────────
   AURORA BACKGROUND
   ────────────────────────────────────────────── */

function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#060611]" />
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/6 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[80px]" />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-400/5 blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-rose-500/4 blur-[80px]" />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#060611_70%)]" />
    </div>
  );
}

/* ──────────────────────────────────────────────
   SHINY TEXT
   ────────────────────────────────────────────── */

function ShinyText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="bg-linear-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
        {children}
      </span>
      <motion.span
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent bg-clip-text text-transparent"
        style={{ backgroundSize: "200% 100%" }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ──────────────────────────────────────────────
   MARQUEE
   ────────────────────────────────────────────── */

function Marquee({ items, direction = "left", speed = 40 }: { items: string[]; direction?: "left" | "right"; speed?: number }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-[#060611] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-[#060611] to-transparent z-10" />
      <motion.div
        className="flex gap-8 w-max"
        animate={{ x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <div key={`${item}-${i}`} className="shrink-0 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-sm text-white/50 font-medium whitespace-nowrap">{item}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAGNETIC BUTTON
   ────────────────────────────────────────────── */

function MagneticButton({ children, href, variant = "primary" }: { children: React.ReactNode; href: string; variant?: "primary" | "secondary" }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };

  const reset = () => { x.set(0); y.set(0); };

  const cls = variant === "primary"
    ? "relative px-8 py-4 bg-linear-to-r from-amber-400 to-yellow-500 text-[#0a0b14] font-semibold rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
    : "px-8 py-4 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 hover:border-white/30 transition-all";

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      whileTap={{ scale: 0.97 }}
      className={cls}
    >
      {children}
    </motion.a>
  );
}

/* ──────────────────────────────────────────────
   GLASS CARD
   ────────────────────────────────────────────── */

function GlassCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, type: "spring", stiffness: 100 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-colors ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   SECTIONS
   ────────────────────────────────────────────── */

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060611] text-white overflow-x-hidden relative">
      <AuroraBackground />
      <div className="relative z-10">
        <Navigation />
        <HeroSection />
        <SocialProofMarquee />
        <BentoFeatures />
        <HowItWorks />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
}

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#060611]/80 backdrop-blur-xl border-b border-white/5" : ""}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-linear-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center font-bold text-sm text-[#060611]">
            S
          </div>
          <span className="text-xl font-semibold tracking-tight">
            <ShinyText>Startr</ShinyText>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
          <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white/80 transition-colors">How it works</a>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-medium rounded-full hover:bg-white/15 transition-all"
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center pt-24 pb-20">
      <motion.div className="max-w-6xl mx-auto px-6 w-full" style={{ y, opacity }}>
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 font-medium">Connecting founders & investors</span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Partnerships that
            <br />
            <ShinyText>truly matter.</ShinyText>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-white/40 max-w-2xl mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Startr intelligently matches founders with investors who share their vision.
            No cold emails. No noise. Just the right connection at the right time.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <MagneticButton href="/signup">Get started free</MagneticButton>
            <MagneticButton href="/login" variant="secondary">Sign in →</MagneticButton>
          </motion.div>

          {/* Floating glassmorphism stat cards with count-up */}
          <div className="mt-20 grid grid-cols-3 gap-4 w-full max-w-2xl">
            {[
              { end: 2.4, suffix: "k+", prefix: "", label: "Active Users", decimals: 1 },
              { end: 87, suffix: "%", prefix: "", label: "Match Rate", decimals: 0 },
              { end: 48, suffix: "M+", prefix: "$", label: "Capital Connected", decimals: 0 },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.06, borderColor: "rgba(251,191,36,0.3)", y: -4 }}
              >
                <p className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
                  <CountUp end={stat.end} suffix={stat.suffix} prefix={stat.prefix} decimals={stat.decimals} duration={2.2} />
                </p>
                <p className="text-xs text-white/40 mt-1 group-hover:text-white/60 transition-colors">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function SocialProofMarquee() {
  const row1 = ["SaaS Founders", "Fintech Investors", "AI/ML Startups", "Healthcare VCs", "Climate Tech", "Web3 Builders", "Deep Tech", "Consumer Apps", "Enterprise Software", "Seed Stage"];
  const row2 = ["Pre-Seed Rounds", "Series A Ready", "Angel Investors", "Solo GPs", "Micro VCs", "Accelerator Alumni", "Technical Founders", "Impact Investors", "B2B Platforms", "Growth Stage"];

  return (
    <section className="py-16 space-y-4">
      <p className="text-center text-xs text-white/20 uppercase tracking-widest mb-6">Built for every stage and sector</p>
      <Marquee items={row1} direction="left" speed={50} />
      <Marquee items={row2} direction="right" speed={45} />
    </section>
  );
}

function BentoFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="py-32 px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="text-amber-400 text-xs tracking-widest uppercase">Features</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4">
            Built for <ShinyText>meaningful</ShinyText> connections
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Large card with animated line graph */}
          <GlassCard className="md:col-span-2 md:row-span-2 p-8" delay={0}>
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">Intelligent Matching</h3>
                <p className="text-white/40 leading-relaxed max-w-md">
                  Our algorithm analyzes thesis alignment, stage preferences, sector focus, and
                  personal compatibility to surface connections that actually make sense.
                </p>
              </div>
              {/* Animated line graph */}
              <div className="mt-6 h-32 relative">
                <div className="absolute inset-x-0 bottom-0 h-px bg-white/5" />
                <div className="absolute left-0 inset-y-0 w-px bg-white/5" />
                <AnimatedLineGraph isInView={isInView} />
                <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between text-[9px] text-white/15">
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
              {/* Animated bar chart below */}
              <div className="mt-10 flex items-end gap-1.5">
                {[40, 65, 45, 80, 55, 90, 70, 85, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-md bg-linear-to-t from-amber-500/30 to-amber-400/10"
                    initial={{ height: 0 }}
                    animate={isInView ? { height: h } : {}}
                    transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 100 }}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard delay={0.1} className="overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Messaging</h3>
            <p className="text-sm text-white/40 leading-relaxed mb-3">Encrypted conversations with typing indicators, read receipts, and smart notifications.</p>
            <LiveFeed isInView={isInView} />
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Verified Profiles</h3>
            <p className="text-sm text-white/40 leading-relaxed mb-3">Every user is verified. Real credentials, real people, real accountability.</p>
            <div className="flex items-center gap-2">
              <VerifiedBadgeAnimation isInView={isInView} />
            </div>
          </GlassCard>

          {/* Bottom wide card */}
          <GlassCard className="md:col-span-3 p-8" delay={0.3}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Due Diligence Dashboard</h3>
                <p className="text-white/40 leading-relaxed">
                  Automated insights on company metrics, team composition, and market positioning — helping investors make informed decisions faster.
                </p>
              </div>
              <div className="flex gap-5">
                <ProgressRing value={78} label="Revenue" color="#fbbf24" delay={0.6} isInView={isInView} />
                <ProgressRing value={92} label="Team" color="#a78bfa" delay={0.8} isInView={isInView} />
                <ProgressRing value={65} label="Traction" color="#34d399" delay={1.0} isInView={isInView} />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    { num: "01", title: "Create your profile", desc: "Tell us about your vision, your thesis, or what you're building. Our system starts learning what matters to you." },
    { num: "02", title: "Discover curated matches", desc: "No infinite scrolling. We surface a focused set of high-quality connections tailored to your preferences." },
    { num: "03", title: "Connect authentically", desc: "When both sides express interest, the conversation begins. Real conversations, real partnerships." },
  ];

  return (
    <section id="how-it-works" ref={ref} className="py-32 px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="text-amber-400 text-xs tracking-widest uppercase">How it works</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4">
            Three steps to your
            <br />
            <span className="text-white/30">next great partnership</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="space-y-16">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="flex items-start gap-8"
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.25, type: "spring", stiffness: 100 }}
              >
                <motion.div
                  className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"
                  whileHover={{ scale: 1.1, borderColor: "rgba(251,191,36,0.4)" }}
                >
                  <span className="text-amber-400 font-bold text-sm">{step.num}</span>
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: [0, 1.3, 1] } : {}}
                    transition={{ delay: 0.6 + i * 0.3, duration: 0.4 }}
                  >
                    <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-40" />
                  </motion.div>
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-white/40 leading-relaxed max-w-lg">{step.desc}</p>
                  <motion.div
                    className="mt-3 h-1 rounded-full bg-linear-to-r from-amber-500/40 to-transparent"
                    initial={{ width: 0 }}
                    animate={isInView ? { width: "60%" } : {}}
                    transition={{ delay: 0.5 + i * 0.3, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    dur: Math.random() * 6 + 4,
    delay: Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-40 px-6 relative overflow-hidden">
      <FloatingParticles />

      <motion.div
        className="absolute inset-0 bg-linear-to-b from-transparent via-amber-500/3 to-transparent"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      />

      {/* Pulsing glow behind CTA */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-4xl mx-auto relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80 }}
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8">
            The next great partnership
            <br />
            <span className="text-white/25">starts with a single</span>
            {" "}
            <ShinyText>hello.</ShinyText>
          </h2>

          <motion.p
            className="text-xl text-white/35 mb-10 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
          >
            Whether you're building the future or funding it, your perfect match is waiting.
          </motion.p>

          {/* Live counter */}
          <motion.div
            className="flex items-center justify-center gap-6 mb-14"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/50">
                <CountUp end={127} duration={2} /> founders online now
              </span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm text-white/50">
                <CountUp end={84} duration={2} /> investors online now
              </span>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 }}
          >
            <MagneticButton href="/signup?role=founder">
              <span className="flex items-center gap-2">
                I'm building something
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
              </span>
            </MagneticButton>
            <MagneticButton href="/signup?role=investor" variant="secondary">
              I'm investing in the future
            </MagneticButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-linear-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center font-bold text-sm text-[#060611]">
            S
          </div>
          <span className="text-lg font-semibold">
            <ShinyText>Startr</ShinyText>
          </span>
        </div>
        <div className="flex items-center gap-8 text-sm text-white/25">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
        </div>
        <p className="text-sm text-white/15">© 2026 Startr</p>
      </div>
    </footer>
  );
}

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Sun,
  Moon,
  ArrowRight,
  BarChart3,
  Calendar,
  Zap,
  Sliders,
  ShieldCheck,
  LayoutDashboard,
  LogIn,
  Scissors,
} from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import { Footer } from "../components/Footer";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // References for dynamic chain alignment
  const logoRef = useRef<HTMLDivElement>(null);
  const scissorsRef = useRef<HTMLDivElement>(null);

  const [logoPos, setLogoPos] = useState({ x: 0, y: 0 });
  const [scissorsPos, setScissorsPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleUpdate = () => {
      if (!logoRef.current || !scissorsRef.current) return;
      const logoRect = logoRef.current.getBoundingClientRect();
      const scissorsRect = scissorsRef.current.getBoundingClientRect();

      setLogoPos({
        x: logoRect.right + 10 + window.scrollX,
        y: logoRect.top + logoRect.height / 2 + window.scrollY,
      });

      setScissorsPos({
        x: scissorsRect.left + scissorsRect.width * 0.5 + window.scrollX,
        y: scissorsRect.top + scissorsRect.height * 0.45 + window.scrollY,
      });
    };

    handleUpdate();

    // Set layout settling fallbacks
    const t1 = setTimeout(handleUpdate, 100);
    const t2 = setTimeout(handleUpdate, 500);

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate);
    };
  }, []);

  const scrollToAbout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const element = document.getElementById("about");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Social and Navigation links for Footer
  const footerData = {
    brandName: "FLCut",
    socialLinks: [
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        ),
        href: "https://github.com",
        label: "GitHub"
      },
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
          </svg>
        ),
        href: "https://twitter.com",
        label: "Twitter"
      },
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        ),
        href: "https://linkedin.com",
        label: "LinkedIn"
      },
    ],
    mainLinks: [
      { href: "#about", label: "About" },
      { href: "/app", label: "Dashboard" },
    ],
    legalLinks: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
    ],
    copyright: {
      text: "© 2026 FLCut. All rights reserved.",
      license: "MIT License",
    },
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-transparent">

      {/* Absolute overlay chain drawing between logo and scissors */}
      {logoPos.x > 0 && scissorsPos.x > 0 && (
        <div className="absolute inset-0 w-full h-[650px] pointer-events-none -z-10 hidden lg:block overflow-hidden">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="chain-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ambient Cyan Under-Glow for premium neon gradient feel */}
            <line
              x1={logoPos.x}
              y1={logoPos.y}
              x2={scissorsPos.x}
              y2={scissorsPos.y}
              stroke={isDark ? "#06b6d4" : "#0891b2"}
              strokeWidth="11"
              strokeLinecap="round"
              filter="url(#chain-neon-glow)"
              className="opacity-30"
            />
            {/* Glowing neon chain blur (Pink) */}
            <line
              x1={logoPos.x}
              y1={logoPos.y}
              x2={scissorsPos.x}
              y2={scissorsPos.y}
              stroke={isDark ? "#db2777" : "#ec4899"}
              strokeWidth="8"
              strokeDasharray="14 24"
              strokeLinecap="round"
              filter="url(#chain-neon-glow)"
              className="opacity-50"
            />
            {/* Foreground crisp chain */}
            <line
              x1={logoPos.x}
              y1={logoPos.y}
              x2={scissorsPos.x}
              y2={scissorsPos.y}
              stroke={isDark ? "#ec4899" : "#db2777"}
              strokeWidth="5"
              strokeDasharray="14 24"
              strokeLinecap="round"
              className="opacity-95"
            />
          </svg>
        </div>
      )}

      {/* Premium Glassmorphic Navbar with subtle accent line */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-500 shadow-md ${isDark
        ? "border-violet-900/10 bg-neutral-950/30 shadow-violet-950/5"
        : "border-violet-200/20 bg-white/30 shadow-violet-100/5"
        }`}>
        {/* Subtle Bottom Accent Glow Line */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">

          {/* Logo Brand */}
          <div ref={logoRef} className="flex items-center gap-3 group relative z-10 select-none">
            <Link href="/app" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 transition-transform group-hover:scale-105">
                <span className="font-black text-black text-lg">FL</span>
              </div>
              <div>
                <span className="font-bold text-lg leading-tight tracking-tight block">
                  FLCut
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-4">

            {/* About Navigation Link */}
            <button
              onClick={scrollToAbout}
              className={`text-sm font-semibold transition-colors cursor-pointer ${isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-black"
                }`}
            >
              About
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark
                ? "bg-neutral-900 border-neutral-800 text-yellow-400 hover:bg-neutral-800"
                : "bg-white border-neutral-200 text-violet-600 hover:bg-neutral-50 shadow-sm"
                }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Auth Action Button */}
            {status === "loading" ? (
              <div className={`h-8 w-20 rounded-xl animate-pulse ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md select-none font-semibold text-xs transition-all ${isDark ? "bg-neutral-900/40 border-neutral-800 text-neutral-200" : "bg-white/40 border-neutral-250 text-neutral-700"}`}>
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-5 w-5 rounded-full border border-neutral-300 dark:border-neutral-750 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center font-bold text-[10px]">
                      {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[120px] truncate">{session?.user?.name || session?.user?.email}</span>
                </div>
                <Link
                  href="/app"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Go to App
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/login?callbackUrl=/app"
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shadow-lg shadow-violet-600/20 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            )}

          </div>
        </div>
      </header>

      {/* Hero Section Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 sm:pt-36 sm:pb-24 flex flex-col justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Text Block */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left gap-6 lg:pr-4">

            {/* Main Brand Title */}
            <div>
              <h1 className="story-script-regular text-8xl sm:text-9xl tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 drop-shadow-[0_2px_15px_rgba(139,92,246,0.15)] leading-[0.85] select-none pb-4">
                flcut
              </h1>
              <h2 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl mt-4 tracking-tight leading-none">
                Link Redirection, <span className="story-script-regular text-violet-500 dark:text-violet-400 text-5xl sm:text-6xl md:text-7xl block sm:inline-block ml-1 font-normal tracking-wide drop-shadow-[0_2px_8px_rgba(139,92,246,0.2)]">Redefined</span>
              </h2>
            </div>

            {/* Subheading/Details */}
            <p className={`text-base sm:text-lg max-w-xl leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"
              }`}>
              Create clean, branded links with instant telemetry. Take command of your redirects with scheduler validation gates, absolute click cap caps, and robust Google authorization filters.
            </p>

            {/* Primary Action Call-to-action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2">
              <Link
                href="/app"
                className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-4 px-10 rounded-2xl text-base transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 cursor-pointer select-none"
              >
                Continue without Sign-In
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

          </div>

          {/* Right Visual Block */}
          <div ref={scissorsRef} className="lg:col-span-5 flex justify-center items-center relative">

            {/* Dynamic visual aura */}
            <div className={`absolute h-80 w-80 rounded-full blur-3xl pointer-events-none -z-10 transition-all duration-700 ${isDark ? "bg-violet-600/10" : "bg-violet-200/30"
              }`} />

            {/* Integrated Vector chain-cutting-scissors graphic */}
            <div className="relative select-none p-4">
              <svg
                className="w-72 h-72 sm:w-96 sm:h-96 relative drop-shadow-[0_15px_40px_rgba(139,92,246,0.25)] animate-float"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Embedded gradients and filters for glowing chrome/neon design */}
                <defs>
                  <linearGradient id="metal-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="35%" stopColor="#cbd5e1" />
                    <stop offset="60%" stopColor="#64748b" />
                    <stop offset="85%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>

                  <filter id="scissors-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={isDark ? "#a855f7" : "#6366f1"} floodOpacity="0.4" />
                    <feDropShadow dx="3" dy="9" stdDeviation="5" floodColor="#000000" floodOpacity="0.35" />
                  </filter>

                  <filter id="cut-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* CSS rotation keyframes embedded directly in the SVG */}
                <style>{`
                  @keyframes cut-left {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-10deg); }
                  }
                  @keyframes cut-right {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(10deg); }
                  }
                `}</style>


                {/* Right Chain segment falling away */}
                <path
                  d="M 112 98 L 190 150"
                  stroke={isDark ? "#db2777" : "#ec4899"}
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeDasharray="14 18"
                  className="opacity-80"
                  filter="url(#cut-glow)"
                />

                {/* Spark particles at cut point */}
                <circle cx="102" cy="92" r="3.5" fill="#fbbf24" filter="url(#cut-glow)" />
                <path d="M 102 92 L 93 80 M 102 92 L 115 82 M 102 92 L 105 105 M 102 92 L 89 97" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" className="opacity-90" />

                {/* Scissors Graphic Parts with metallic gradient & premium shadows */}
                <g className="origin-[100px_90px]" style={{ animation: "cut-left 3.5s ease-in-out infinite" }} filter="url(#scissors-shadow)">
                  {/* Handle Loop */}
                  <circle cx="145" cy="45" r="16.5" stroke="url(#metal-chrome)" strokeWidth="6" fill="none" />
                  {/* Blade element */}
                  <path d="M 132 56 L 100 90 L 60 130" stroke="url(#metal-chrome)" strokeWidth="7" strokeLinecap="round" />
                  {/* Shiny cutting edge highlight */}
                  <path d="M 100 90 L 60 130" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                <g className="origin-[100px_90px]" style={{ animation: "cut-right 3.5s ease-in-out infinite" }} filter="url(#scissors-shadow)">
                  {/* Handle Loop */}
                  <circle cx="145" cy="135" r="16.5" stroke="url(#metal-chrome)" strokeWidth="6" fill="none" />
                  {/* Blade element */}
                  <path d="M 132 124 L 100 90 L 60 50" stroke="url(#metal-chrome)" strokeWidth="7" strokeLinecap="round" />
                  {/* Shiny cutting edge highlight */}
                  <path d="M 100 90 L 60 50" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Screw center pivot pin */}
                <circle cx="100" cy="90" r="5" fill={isDark ? "#334155" : "#1e293b"} stroke="#f8fafc" strokeWidth="2" />
              </svg>
            </div>

          </div>

        </div>
      </main>

      {/* About Benefits Section */}
      <section
        id="about"
        className={`py-20 border-t scroll-mt-20 transition-colors duration-500 ${isDark
          ? "border-neutral-900 bg-neutral-950/40"
          : "border-neutral-100 bg-neutral-50/50"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-16">

          {/* Section Heading */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-mono font-bold tracking-widest text-violet-500 uppercase">
              Creator Toolkit
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Powerful redirection utility suite
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full mt-2" />
          </div>

          {/* Grid Layout of Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Card 1: Advanced Analytics */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Telemetry Logs</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Real-Time Analytics</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Track clicks, unique creators, countries, browser formats, and operating system metrics on every link.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-violet-100 border-violet-200 text-violet-700"
                }`}>
                MOST POPULAR
              </span>
            </div>

            {/* Card 2: Validity Scheduler */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <Calendar className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Chronos Controls</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Validity Scheduler</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Enforce date ranges. Shortlinks automatically activate and expire at precise scheduled timestamps.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-100 border-emerald-200 text-emerald-700"
                }`}>
                PREMIUM UTILITY
              </span>
            </div>

            {/* Card 3: Click Limit Caps */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <Zap className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Redirection Caps</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Click Limit Caps</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Input a click maximum cap. Once reached, redirect access is terminated instantly to secure destinations.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-100 border-amber-200 text-amber-700"
                }`}>
                ADVANCED GUARD
              </span>
            </div>

            {/* Card 4: Custom Slugs */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <Sliders className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Aliases Configuration</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Customizable Slugs</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Bypass standard random hash links. Choose your own distinct slug text to promote brand identification.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700"
                }`}>
                BRAND CONTROL
              </span>
            </div>

            {/* Card 5: Access Controls */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Gatekeeper filters</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Visitor Authentication</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Force visitors to sign in via Google login validation before they can access the final destination.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-violet-500/10 border-violet-500/20 text-violet-400" : "bg-violet-100 border-violet-200 text-violet-700"
                }`}>
                SECURITY LEVEL 1
              </span>
            </div>

            {/* Card 6: Local Dashboard */}
            <div className={`group border rounded-3xl p-8 flex flex-col items-start text-left gap-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${isDark
              ? "bg-neutral-900/40 border-neutral-800/80 hover:border-violet-500/30 hover:bg-neutral-900/60 shadow-lg shadow-black/20"
              : "bg-white border-neutral-200 hover:border-violet-500/20 hover:bg-white shadow-md hover:shadow-lg shadow-neutral-100"
              }`}>
              <div className={`p-3.5 rounded-2xl border transition-colors ${isDark ? "bg-neutral-950 border-neutral-800 text-violet-400 group-hover:text-white" : "bg-neutral-50 border-neutral-200 text-violet-600"
                }`}>
                <Scissors className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-violet-500 tracking-wider uppercase">Browser Session storage</span>
                <h3 className={`font-bold text-lg group-hover:text-violet-500 transition-colors ${isDark ? "text-white" : "text-neutral-900"}`}>Instant Storage</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Shorten immediately without accounts. Non-logged users can view their created links stored inside localStorage.
                </p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide mt-2 ${isDark ? "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-700"
                }`}>
                FREE DEMO
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* Reusable Custom Footer */}
      <Footer />

    </div>
  );
}

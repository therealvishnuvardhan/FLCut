"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Clock, Ban, ArrowLeft } from "lucide-react";
import Link from "next/link";

function InactiveContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "link";
  const reason = searchParams.get("reason");

  let Icon = AlertTriangle;
  let title = "Link Inactive";
  let description = "This short link is currently inactive or unavailable.";
  let badgeColor = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";

  if (reason === "expired") {
    Icon = Clock;
    title = "Link Expired";
    description = "The scheduled validity period set by the creator has ended. This short link is no longer active.";
    badgeColor = "bg-red-500/10 border-red-500/20 text-red-400";
  } else if (reason === "limit") {
    Icon = Ban;
    title = "Click Limit Exceeded";
    description = "This short link has reached its maximum configured click limit and is no longer accepting redirects.";
    badgeColor = "bg-orange-500/10 border-orange-500/20 text-orange-400";
  } else if (reason === "not_active") {
    Icon = Clock;
    title = "Link Pending";
    description = "This short link has been scheduled for a future date and is not active yet. Please try again later.";
    badgeColor = "bg-blue-500/10 border-blue-500/20 text-blue-400";
  }

  return (
    <div className="relative max-w-md w-full bg-white/60 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 md:p-10 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-8 text-center animate-scaleIn transition-all duration-300">
      {/* Icon Badge */}
      <div className={`h-16 w-16 rounded-2xl border flex items-center justify-center shadow-lg ${badgeColor}`}>
        <Icon className="h-8 w-8" />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tracking-widest uppercase">
          LinkChop Redirect Guard
        </span>
        <h1 className="font-bold text-2xl text-neutral-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Details box */}
      <div className="w-full bg-neutral-50 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-4 flex flex-col gap-2 text-left font-mono text-xs text-neutral-550 dark:text-neutral-500">
        <div>
          <span className="text-neutral-500 dark:text-neutral-400">Slug:</span> /{slug}
        </div>
        <div>
          <span className="text-neutral-500 dark:text-neutral-400">Status:</span> Inactive
        </div>
      </div>

      {/* Action button */}
      <Link
        href="/"
        className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-black font-bold py-3.5 px-6 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg select-none cursor-pointer font-sans"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to LinkChop Home
      </Link>
    </div>
  );
}

export default function InactivePage() {
  return (
    <div className="min-h-screen bg-transparent text-neutral-900 dark:text-neutral-100 flex flex-col font-sans relative overflow-hidden items-center justify-center px-4 transition-colors duration-500">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full dark:bg-violet-900/10 light:bg-violet-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full dark:bg-cyan-900/10 light:bg-cyan-500/5 blur-[150px] pointer-events-none" />

      <Suspense fallback={
        <div className="relative max-w-md w-full bg-white/60 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 text-center animate-pulse">
          <div className="h-16 w-16 bg-neutral-800 rounded-2xl" />
          <div className="h-6 bg-neutral-800 rounded w-1/2" />
          <div className="h-4 bg-neutral-800 rounded w-3/4" />
          <div className="h-12 bg-neutral-800 rounded-xl w-full" />
        </div>
      }>
        <InactiveContent />
      </Suspense>
    </div>
  );
}

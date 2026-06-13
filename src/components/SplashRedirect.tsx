"use client";

import { useEffect } from "react";

interface SplashRedirectProps {
  slug: string;
  longUrl: string;
  linkId: number;
}

export default function SplashRedirect({ slug, longUrl, linkId }: SplashRedirectProps) {
  useEffect(() => {
    // 1. Check unique visit in sessionStorage
    const sessionKey = `flc_route_${slug}`;
    const hasVisited = sessionStorage.getItem(sessionKey);
    let isUnique = false;

    if (!hasVisited) {
      isUnique = true;
      sessionStorage.setItem(sessionKey, "1");
    }

    // 2. Telemetry payload
    const payload = {
      linkId,
      slug,
      isUnique,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    // 3. Fire beacon asynchronously
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/v1/track-hit", blob);
    } else {
      // Fallback
      fetch("/api/v1/track-hit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.error("Telemetry fetch failed:", err));
    }

    // 4. Redirect after 750ms
    const timer = setTimeout(() => {
      window.location.replace(longUrl);
    }, 750);

    return () => clearTimeout(timer);
  }, [slug, longUrl, linkId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-neutral-900 to-black text-white px-6 font-sans">
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Glow decoration */}
        <div className="absolute top-[-50px] left-[-50px] h-32 w-32 rounded-full bg-violet-600/20 blur-2xl animate-pulse" />
        <div className="absolute bottom-[-50px] right-[-50px] h-32 w-32 rounded-full bg-cyan-600/20 blur-2xl animate-pulse" />

        <div className="relative bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 w-full">
          {/* Logo badge */}
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/10">
            <span className="font-black text-black text-xl">FL</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Redirecting you safely
            </h2>
            <p className="text-neutral-400 text-xs truncate max-w-[280px]">
              Destination: {longUrl}
            </p>
          </div>

          {/* Premium Loader */}
          <div className="relative h-10 w-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-neutral-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-cyan-400 animate-spin" />
          </div>

          <p className="text-[10px] text-neutral-500 font-mono tracking-wider">
            FLCUT SECURE LINK
          </p>
        </div>
      </div>
    </div>
  );
}

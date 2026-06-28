"use client";

import { useEffect } from "react";

interface RedirectSplashProps {
  linkId: number;
  slug: string;
  longUrl: string;
}

export function RedirectSplash({ linkId, slug, longUrl }: RedirectSplashProps) {
  useEffect(() => {
    const cookieName = `linkchop_visit_${slug}`;
    console.log("=== client-side uniqueness debug ===");
    console.log("document.cookie:", document.cookie);
    const hasVisited = document.cookie.includes(`${cookieName}=`);
    console.log("cookieName:", cookieName, "hasVisited:", hasVisited);
    let isUnique = false;

    if (!hasVisited) {
      isUnique = true;
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `${cookieName}=1; path=/; max-age=86400; SameSite=Lax${isHttps ? "; Secure" : ""}`;
      console.log("wrote cookie, new document.cookie:", document.cookie);
    }

    const payload = JSON.stringify({
      linkId,
      slug,
      isUnique,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/v1/track-hit", blob);
    } else {
      fetch("/api/v1/track-hit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(console.error);
    }

    const timer = setTimeout(() => {
      window.location.replace(longUrl);
    }, 1500);

    return () => clearTimeout(timer);
  }, [linkId, slug, longUrl]);

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col items-center justify-center px-6 font-sans overflow-hidden relative">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-cyan-600/10 blur-[100px] animate-pulse pointer-events-none"></div>

      <div className="relative flex flex-col items-center w-full max-w-sm text-center">
        {/* Main Glassmorphism Redirect Card */}
        <div className="relative bg-neutral-900/30 backdrop-blur-3xl border border-neutral-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center gap-7 w-full transition-transform duration-500 hover:scale-[1.01]">
          
          {/* Header Tag */}
          <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-neutral-950 border border-neutral-800 shadow-md flex items-center gap-1.5 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[8px] font-bold text-neutral-400 tracking-widest uppercase">LinkChop Secure</span>
          </div>

          {/* Security SVG Icon with fixed inline sizes */}
          <div className="relative flex items-center justify-center h-16 w-16 bg-neutral-950/60 rounded-2xl border border-neutral-800/85 shadow-inner">
            <svg 
              style={{ width: "36px", height: "36px" }} 
              className="text-cyan-400" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Animated drawing shield path */}
              <path 
                style={{
                  strokeDasharray: "200",
                  strokeDashoffset: "200",
                  animation: "drawShield 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                }}
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
              />
              <path 
                style={{
                  strokeDasharray: "200",
                  strokeDashoffset: "200",
                  animation: "drawShield 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards"
                }}
                strokeWidth="2.5" 
                d="m9 11 2 2 4-4" 
              />
            </svg>
            
            {/* Pulsing dot */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          {/* Redirection Info */}
          <div className="flex flex-col gap-2 text-center w-full">
            <h2 className="text-xl font-bold tracking-tight text-white">Redirecting you safely</h2>
            <p className="text-neutral-400 text-xs truncate max-w-[280px] font-medium mx-auto animate-pulse" title={longUrl}>
              Destination: <span className="text-cyan-400 font-mono text-[11px]">{longUrl}</span>
            </p>
          </div>

          {/* Progress bar loader */}
          <div className="w-full flex flex-col gap-2.5 items-center">
            <div className="w-full bg-neutral-950/80 rounded-full h-1.5 overflow-hidden border border-neutral-850">
              <div 
                style={{
                  animation: "fillProgress 1500ms cubic-bezier(0.4, 0, 0.2, 1) forwards"
                }}
                className="bg-gradient-to-r from-violet-600 to-cyan-400 h-full rounded-full w-0"
              ></div>
            </div>
            <span className="text-[9px] text-neutral-500 font-mono tracking-widest uppercase">Connecting to destination...</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drawShield {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

import { NextRequest, NextResponse, after } from "next/server";
import { notFound } from "next/navigation";
import { db } from "../../lib/db";
import { auth } from "../../auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Query database for the short link
    const link = await db.shortLink.findUnique({
      where: {
        slug,
      },
    });

    if (!link) {
      notFound();
    }

    // If visitor auth is required, block anonymous access
    if (!link.bypassAuth) {
      const session = await auth();
      if (!session?.user) {
        const loginUrl = new URL("/auth/login", req.url);
        loginUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Check validity dates (Phase 2 scheduling)
    const now = new Date();
    if (link.validFrom && now < link.validFrom) {
      return NextResponse.redirect(
        new URL(`/inactive?slug=${slug}&reason=not_active`, req.url)
      );
    }

    if (link.validUntil && now > link.validUntil) {
      return NextResponse.redirect(
        new URL(`/inactive?slug=${slug}&reason=expired`, req.url)
      );
    }

    // Check click cap (Phase 2 maxClicks)
    if (link.maxClicks !== null) {
      try {
        const { redis } = await import("../../lib/redis");
        const clicks = await redis.incr(`click_count:${slug}`);
        if (clicks > link.maxClicks) {
          return NextResponse.redirect(
            new URL(`/inactive?slug=${slug}&reason=limit`, req.url)
          );
        }
      } catch (redisError) {
        console.error("Failed to increment click count in Redis:", redisError);
      }
    }

    // If bypassAuth is true, serve the lightweight 750ms splash screen for client-side telemetry
    if (link.bypassAuth) {
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redirecting...</title>
    <link href="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" rel="stylesheet" />
    <style>
      body {
        background-color: #050505;
        color: #ffffff;
      }
      @keyframes pulseGlow {
        0%, 100% { transform: scale(1); opacity: 0.15; }
        50% { transform: scale(1.15); opacity: 0.3; }
      }
      @keyframes floatCard {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes fillProgress {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes textEntrance {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes drawShield {
        to { stroke-dashoffset: 0; }
      }
      .animate-glow-violet {
        animation: pulseGlow 4s ease-in-out infinite;
      }
      .animate-glow-cyan {
        animation: pulseGlow 4s ease-in-out infinite 2s;
      }
      .animate-float {
        animation: floatCard 4s ease-in-out infinite;
      }
      .animate-progress {
        animation: fillProgress 1500ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .animate-text-1 {
        animation: textEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-text-2 {
        animation: textEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
        opacity: 0;
      }
      .animate-text-3 {
        animation: textEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        opacity: 0;
      }
      .shield-path {
        stroke-dasharray: 200;
        stroke-dashoffset: 200;
        animation: drawShield 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
    </style>
  </head>
  <body class="flex min-h-screen flex-col items-center justify-center bg-radial from-neutral-900 to-black px-6 font-sans overflow-hidden relative">
    <!-- Glow decorations -->
    <div class="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[100px] animate-glow-violet pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-cyan-600/10 blur-[100px] animate-glow-cyan pointer-events-none"></div>

    <div class="relative flex flex-col items-center w-full max-w-sm text-center">
      <div class="relative bg-neutral-900/30 backdrop-blur-3xl border border-neutral-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center gap-7 w-full animate-float">
        
        <!-- Header Tag -->
        <div class="absolute top-[-16px] left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-neutral-950 border border-neutral-800 shadow-md flex items-center gap-1.5 select-none">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-mono text-[8px] font-bold text-neutral-400 tracking-widest uppercase">FLCut Secure</span>
        </div>

        <!-- Security SVG Icon -->
        <div class="relative flex items-center justify-center h-16 w-16 bg-neutral-950/60 rounded-2xl border border-neutral-800/85 shadow-inner">
          <svg class="h-9 w-9 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path class="shield-path" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path class="shield-path" stroke-width="2.5" d="m9 11 2 2 4-4" style="animation-delay: 0.4s;" />
          </svg>
          <!-- Pulsing dot -->
          <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
        </div>

        <!-- Redirection Info -->
        <div class="flex flex-col gap-2 text-center w-full">
          <h2 class="text-xl font-bold tracking-tight text-white animate-text-1">Redirecting you safely</h2>
          <p class="text-neutral-400 text-xs truncate max-w-[280px] font-medium animate-text-2 mx-auto" title="${link.longUrl}">
            Destination: <span class="text-cyan-400 font-mono text-[11px]">${link.longUrl}</span>
          </p>
        </div>

        <!-- Progress bar loader -->
        <div class="w-full flex flex-col gap-2.5 items-center animate-text-3">
          <div class="w-full bg-neutral-950/80 rounded-full h-1.5 overflow-hidden border border-neutral-850">
            <div class="bg-gradient-to-r from-violet-600 to-cyan-400 h-full rounded-full animate-progress"></div>
          </div>
          <span class="text-[9px] text-neutral-500 font-mono tracking-widest uppercase">Connecting to destination...</span>
        </div>
      </div>
    </div>

    <script>
      (function() {
        const slug = "${slug}";
        const longUrl = "${link.longUrl}";
        const linkId = ${link.id};

        const sessionKey = "flc_route_" + slug;
        const hasVisited = sessionStorage.getItem(sessionKey);
        let isUnique = false;

        if (!hasVisited) {
          isUnique = true;
          sessionStorage.setItem(sessionKey, "1");
        }

        const payload = JSON.stringify({
          linkId,
          slug,
          isUnique,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null
        });

        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/v1/track-hit", blob);
        } else {
          fetch("/api/v1/track-hit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true
          }).catch(console.error);
        }

        setTimeout(function() {
          window.location.replace(longUrl);
        }, 1500);
      })();
    </script>
  </body>
</html>`,
        {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Perform a non-cached 302 Found redirect to the destination longUrl with server-side analytics tracking
    const cookieName = `flc_visit_${slug}`;
    const hasVisitedCookie = req.cookies.get(cookieName);
    const isUnique = !hasVisitedCookie;

    const userAgent = req.headers.get("user-agent");
    const countryHeader = req.headers.get("x-vercel-ip-country");
    const cityHeader = req.headers.get("x-vercel-ip-city");

    let country = countryHeader ? countryHeader.trim() : null;
    let city = null;
    if (cityHeader) {
      try {
        city = decodeURIComponent(cityHeader).trim();
      } catch {
        city = cityHeader.trim();
      }
    }

    const response = new NextResponse(null, {
      status: 302,
      headers: {
        Location: link.longUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (isUnique) {
      response.cookies.set(cookieName, "1", {
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        sameSite: "lax",
      });
    }

    after(async () => {
      try {
        await db.analyticsEvent.create({
          data: {
            linkId: link.id,
            isUnique,
            userAgent: userAgent ? String(userAgent).substring(0, 500) : null,
            country,
            city,
          },
        });

        const now = new Date();
        const timeBucket = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          0,
          0,
          0
        );

        await db.hourlyAggregate.upsert({
          where: {
            linkId_timeBucket: {
              linkId: link.id,
              timeBucket,
            },
          },
          update: {
            clicks: { increment: 1 },
            uniqueClicks: isUnique ? { increment: 1 } : undefined,
          },
          create: {
            linkId: link.id,
            timeBucket,
            clicks: 1,
            uniqueClicks: isUnique ? 1 : 0,
          },
        });
      } catch (backgroundError) {
        console.error("Server-side background analytics processing error:", backgroundError);
      }
    });

    return response;
  } catch (error) {
    // If it was a Next.js notFound() error, rethrow it so Next.js handles the 404 page
    if (
      error instanceof Error &&
      (error.message === "NEXT_NOT_FOUND" ||
        (error as any).digest === "NEXT_NOT_FOUND")
    ) {
      throw error;
    }

    console.error("Redirection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

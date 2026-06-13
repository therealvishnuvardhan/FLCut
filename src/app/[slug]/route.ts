import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { db } from "../../lib/db";

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

    // Check validity dates (Phase 2 scheduling)
    const now = new Date();
    if (link.validFrom && now < link.validFrom) {
      // Redirect back to home with message
      return NextResponse.redirect(
        new URL(`/?error=link_not_active&slug=${slug}`, req.url)
      );
    }

    if (link.validUntil && now > link.validUntil) {
      if (link.fallbackUrl) {
        return new NextResponse(null, {
          status: 302,
          headers: {
            Location: link.fallbackUrl,
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }
      return NextResponse.redirect(
        new URL(`/?error=link_expired&slug=${slug}`, req.url)
      );
    }

    // Check click cap (Phase 2 maxClicks)
    if (link.maxClicks !== null) {
      try {
        const { redis } = await import("../../lib/redis");
        const clicks = await redis.incr(`click_count:${slug}`);
        if (clicks > link.maxClicks) {
          if (link.fallbackUrl) {
            return new NextResponse(null, {
              status: 302,
              headers: {
                Location: link.fallbackUrl,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });
          }
          return NextResponse.redirect(
            new URL(`/?error=link_limit_reached&slug=${slug}`, req.url)
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
        background-color: #0a0a0a;
        color: #ffffff;
      }
    </style>
  </head>
  <body class="flex min-h-screen flex-col items-center justify-center bg-radial from-neutral-900 to-black px-6 font-sans">
    <div class="relative flex flex-col items-center max-w-sm text-center">
      <!-- Glow decoration -->
      <div class="absolute top-[-50px] left-[-50px] h-32 w-32 rounded-full bg-violet-600/20 blur-2xl animate-pulse"></div>
      <div class="absolute bottom-[-50px] right-[-50px] h-32 w-32 rounded-full bg-cyan-600/20 blur-2xl animate-pulse"></div>

      <div class="relative bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 w-full">
        <!-- Logo badge -->
        <div class="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/10">
          <span class="font-black text-black text-xl">FL</span>
        </div>

        <div class="flex flex-col gap-2">
          <h2 class="text-xl font-bold tracking-tight text-white">Redirecting you safely</h2>
          <p class="text-neutral-400 text-xs truncate max-w-[280px]">Destination: ${link.longUrl}</p>
        </div>

        <!-- Loader -->
        <div class="relative h-10 w-10 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-4 border-neutral-800"></div>
          <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-cyan-400 animate-spin"></div>
        </div>

        <p class="text-[10px] text-neutral-500 font-mono tracking-wider">FLCUT SECURE LINK</p>
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
        }, 750);
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

    // Perform a non-cached 302 Found redirect to the destination longUrl
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: link.longUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
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

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

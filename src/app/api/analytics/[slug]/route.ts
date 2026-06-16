import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { auth } from "../../../../auth";
import { redis } from "../../../../lib/redis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    // Fetch the link with analytics events and hourly aggregates
    const link = await db.shortLink.findUnique({
      where: { slug },
      include: {
        analyticsEvents: {
          orderBy: { clickedAt: "desc" },
        },
        hourlyAggregates: {
          orderBy: { timeBucket: "asc" },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Short link not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Ownership check: If link has a creator, verify it matches the logged-in session user ID
    if (link.creatorId && link.creatorId !== session?.user?.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this link" },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Fetch bot clicks counter from Redis
    let botClicks = 0;
    try {
      const redisVal = await redis.get(`link:${slug}:bots`);
      if (redisVal !== null) {
        botClicks = Number(redisVal);
      }
    } catch (redisErr) {
      console.error("Failed to fetch bot clicks from Redis:", redisErr);
    }

    // Return link details and telemetry without caching
    return NextResponse.json(
      {
        ...link,
        botClicks,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching analytics details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}

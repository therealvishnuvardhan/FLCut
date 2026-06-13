import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { auth } from "../../../../auth";

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

    // Return link details and telemetry without caching
    return NextResponse.json(link, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
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

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { linkId, slug, isUnique, userAgent } = body;

    if (!linkId || typeof linkId !== "number" || !slug) {
      return NextResponse.json(
        { error: "Invalid telemetry payload" },
        { status: 400 }
      );
    }

    // Extract Vercel Geolocation headers
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

    // Process tracking in the background without blocking the client redirect
    after(async () => {
      try {
        // 1. Create the Analytics Event record
        await db.analyticsEvent.create({
          data: {
            linkId,
            isUnique: !!isUnique,
            userAgent: userAgent ? String(userAgent).substring(0, 500) : null, // Limit length
            country,
            city,
          },
        });

        // 2. Calculate current hour time bucket
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

        // 3. Upsert the HourlyAggregate record
        await db.hourlyAggregate.upsert({
          where: {
            linkId_timeBucket: {
              linkId,
              timeBucket,
            },
          },
          update: {
            clicks: { increment: 1 },
            uniqueClicks: isUnique ? { increment: 1 } : undefined,
          },
          create: {
            linkId,
            timeBucket,
            clicks: 1,
            uniqueClicks: isUnique ? 1 : 0,
          },
        });
      } catch (backgroundError) {
        console.error("Background analytics processing error:", backgroundError);
      }
    });

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    console.error("Telemetry ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "../../lib/db";
import { auth } from "../../auth";
import { RedirectSplash } from "./RedirectSplash";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Query database for the short link
  const link = await db.shortLink.findUnique({
    where: { slug },
  });

  if (!link) {
    notFound();
  }

  // If visitor auth is required, block anonymous access
  if (!link.bypassAuth) {
    const session = await auth();
    if (!session?.user) {
      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3000";
      const proto = headersList.get("x-forwarding-proto") || "http";
      const redirectUrl = `/auth/login?callbackUrl=${encodeURIComponent(`${proto}://${host}/${slug}`)}`;
      redirect(redirectUrl);
    }
  }

  // Check validity dates
  const now = new Date();
  if (link.validFrom && now < new Date(link.validFrom)) {
    redirect(`/inactive?slug=${slug}&reason=not_active`);
  }

  if (link.validUntil && now > new Date(link.validUntil)) {
    redirect(`/inactive?slug=${slug}&reason=expired`);
  }

  // Check click cap
  if (link.maxClicks !== null) {
    let limitReached = false;
    try {
      const { redis } = await import("../../lib/redis");
      const clicks = await redis.incr(`click_count:${slug}`);
      if (clicks > link.maxClicks) {
        limitReached = true;
      }
    } catch (redisError) {
      console.error("Failed to increment click count in Redis:", redisError);
    }
    if (limitReached) {
      redirect(`/inactive?slug=${slug}&reason=limit`);
    }
  }

  // If bypassAuth is true, render the RedirectSplash client component (HTML/CSS + sendBeacon payload)
  if (link.bypassAuth) {
    return <RedirectSplash linkId={link.id} slug={slug} longUrl={link.longUrl} />;
  }

  // For non-bypassed auth links (direct server-side redirect after successful auth)
  const cookieStore = await cookies();
  const cookieName = `flc_visit_${slug}`;
  const hasVisitedCookie = cookieStore.get(cookieName);
  const isUnique = !hasVisitedCookie;

  if (isUnique) {
    cookieStore.set(cookieName, "1", {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Track the hit in database in background
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const countryHeader = headersList.get("x-vercel-ip-country");
  const cityHeader = headersList.get("x-vercel-ip-city");

  let country = countryHeader ? countryHeader.trim() : null;
  let city = null;
  if (cityHeader) {
    try {
      city = decodeURIComponent(cityHeader).trim();
    } catch {
      city = cityHeader.trim();
    }
  }

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

  // Perform server-side redirect
  redirect(link.longUrl);
}

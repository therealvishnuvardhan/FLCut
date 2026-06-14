import { notFound, redirect } from "next/navigation";
import { db } from "../../lib/db";
import { auth } from "../../auth";
import { RedirectSplash } from "./RedirectSplash";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const dbClicksCount = await db.analyticsEvent.count({
      where: { linkId: link.id },
    });
    if (dbClicksCount >= link.maxClicks) {
      redirect(`/inactive?slug=${slug}&reason=limit`);
    }
  }

  // If visitor auth is required, block anonymous access
  if (!link.bypassAuth) {
    const session = await auth();
    if (!session?.user) {
      const redirectUrl = `/auth/login?callbackUrl=${encodeURIComponent(`/${slug}`)}`;
      redirect(redirectUrl);
    }
  }

  // Render the RedirectSplash client component (HTML/CSS + sendBeacon payload)
  return <RedirectSplash linkId={link.id} slug={slug} longUrl={link.longUrl} />;
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { auth } from "../../../auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // If logged in, fetch all links created by this user
    if (session?.user?.id) {
      const links = await db.shortLink.findMany({
        where: {
          creatorId: session.user.id,
        },
        include: {
          analyticsEvents: {
            orderBy: {
              clickedAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return NextResponse.json(links, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Fallback to anonymous local storage slugs
    const url = new URL(req.url);
    const slugsParam = url.searchParams.get("slugs");

    if (!slugsParam) {
      return NextResponse.json([]);
    }

    const slugs = slugsParam
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      return NextResponse.json([]);
    }

    const links = await db.shortLink.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      include: {
        analyticsEvents: {
          orderBy: {
            clickedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(links, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching local links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Verify ownership
    const link = await db.shortLink.findUnique({
      where: { slug },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (link.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.shortLink.delete({
      where: { slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { slug, longUrl, maxClicks, validFrom, validUntil, bypassAuth } = body;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Verify ownership
    const link = await db.shortLink.findUnique({
      where: { slug },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // If the link has a creator, verify it matches the logged in user
    if (link.creatorId && link.creatorId !== session?.user?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate longUrl format if updating
    let targetUrl = link.longUrl;
    if (longUrl && typeof longUrl === "string") {
      targetUrl = longUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }
      try {
        new URL(targetUrl);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      longUrl: targetUrl,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxClicks: maxClicks !== undefined && maxClicks !== "" && maxClicks !== null ? parseInt(String(maxClicks), 10) : null,
      bypassAuth: typeof bypassAuth === "boolean" ? bypassAuth : link.bypassAuth,
    };

    const updatedLink = await db.shortLink.update({
      where: { slug },
      data: updateData,
      include: {
        analyticsEvents: {
          orderBy: { clickedAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

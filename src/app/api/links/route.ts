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
      return NextResponse.json(links);
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

    return NextResponse.json(links);
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

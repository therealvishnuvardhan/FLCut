import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET(req: NextRequest) {
  try {
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { encodeId } from "../../../lib/hashids";
import { hasProfanity } from "../../../lib/profanity";

const RESERVED_SLUGS = [
  "api",
  "dashboard",
  "admin",
  "auth",
  "login",
  "links",
  "shorten",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { longUrl, customSlug } = body;

    // Validate longUrl existence
    if (!longUrl || typeof longUrl !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate longUrl format
    let targetUrl = longUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Handle Custom Slug validation and creation
    if (customSlug) {
      const slug = customSlug.trim();

      // Check length constraints
      if (slug.length < 3 || slug.length > 30) {
        return NextResponse.json(
          { error: "Custom slug must be between 3 and 30 characters" },
          { status: 400 }
        );
      }

      // Check allowed characters (alphanumeric, hyphen, underscore)
      if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
        return NextResponse.json(
          { error: "Custom slug must contain only letters, numbers, hyphens, and underscores" },
          { status: 400 }
        );
      }

      // Check reserved slugs
      if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
        return NextResponse.json(
          { error: "This slug is reserved and cannot be used" },
          { status: 400 }
        );
      }

      // Check profanity
      if (hasProfanity(slug)) {
        return NextResponse.json(
          { error: "Slug contains inappropriate language" },
          { status: 400 }
        );
      }

      try {
        const newLink = await db.shortLink.create({
          data: {
            slug,
            longUrl: targetUrl,
          },
        });
        return NextResponse.json(newLink, { status: 201 });
      } catch (error: any) {
        // P2002 is Prisma's code for unique constraint violation
        if (error.code === "P2002") {
          // Generate 3 unique suggestions
          const suggestions = [
            `${slug}-flc`,
            `${slug}-2026`,
            `${slug}-rsvp`,
          ];
          return NextResponse.json(
            {
              error: "This custom slug is already taken",
              suggestions,
            },
            { status: 409 }
          );
        }
        throw error;
      }
    } else {
      // Auto-generate slug using database sequence and hashids
      const result = await db.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('short_links_id_seq')
      `;

      const nextId = Number(result[0].nextval);
      const generatedSlug = encodeId(nextId);

      const newLink = await db.shortLink.create({
        data: {
          id: nextId,
          slug: generatedSlug,
          longUrl: targetUrl,
        },
      });

      return NextResponse.json(newLink, { status: 201 });
    }
  } catch (error: any) {
    console.error("Error creating short link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

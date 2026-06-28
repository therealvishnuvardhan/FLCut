import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { encodeId } from "../../../lib/hashids";
import { hasProfanity } from "../../../lib/profanity";
import { auth } from "../../../auth";

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
    const session = await auth();
    const creatorId = session?.user?.id || null;

    const body = await req.json();
    const {
      longUrl,
      customSlug,
      validFrom,
      validUntil,
      maxClicks,
      fallbackUrl,
      bypassAuth,
    } = body;

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

    // Common data for creation
    const creationData: any = {
      longUrl: targetUrl,
      creatorId,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxClicks: maxClicks ? parseInt(String(maxClicks), 10) : null,
      fallbackUrl: fallbackUrl ? String(fallbackUrl).trim() : null,
      bypassAuth: typeof bypassAuth === "boolean" ? bypassAuth : true,
    };

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
            ...creationData,
            slug,
          },
        });
        return NextResponse.json(newLink, { status: 201 });
      } catch (error: any) {
        // P2002 is Prisma's code for unique constraint violation
        if (error.code === "P2002") {
          const suggestions = await generateUniqueSuggestions(slug);
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
          ...creationData,
          id: nextId,
          slug: generatedSlug,
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

async function generateUniqueSuggestions(baseSlug: string): Promise<string[]> {
  const suggestions: string[] = [];
  const suffixes = [
    "chop",
    "2026",
    "rsvp",
    "link",
    "go",
    "hub",
    "url",
    "fast",
    "club",
    "now",
    "vip",
    "direct",
  ];

  // 1. Try standard suffixes first
  for (const suffix of suffixes) {
    if (suggestions.length >= 3) break;
    const candidate = `${baseSlug}-${suffix}`;

    // Check if reserved or profanity or already exists
    if (RESERVED_SLUGS.includes(candidate.toLowerCase()) || hasProfanity(candidate)) {
      continue;
    }

    const existing = await db.shortLink.findUnique({
      where: { slug: candidate },
    });

    if (!existing) {
      suggestions.push(candidate);
    }
  }

  // 2. If we still need more suggestions, try appending random numbers
  let attempts = 0;
  while (suggestions.length < 3 && attempts < 50) {
    attempts++;
    const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit random number
    const candidate = `${baseSlug}-${randomNum}`;

    if (RESERVED_SLUGS.includes(candidate.toLowerCase()) || hasProfanity(candidate)) {
      continue;
    }

    const existing = await db.shortLink.findUnique({
      where: { slug: candidate },
    });

    if (!existing) {
      suggestions.push(candidate);
    }
  }

  // 3. Absolute fallback: counter loop if nothing works
  let counter = 1;
  while (suggestions.length < 3) {
    const candidate = `${baseSlug}-${counter}`;

    if (RESERVED_SLUGS.includes(candidate.toLowerCase()) || hasProfanity(candidate)) {
      counter++;
      continue;
    }

    const existing = await db.shortLink.findUnique({
      where: { slug: candidate },
    });

    if (!existing) {
      suggestions.push(candidate);
    }
    counter++;
  }

  return suggestions;
}

import { db } from "./src/lib/db";
const prisma = db;

async function main() {
  const link = await prisma.shortLink.findUnique({
    where: { slug: "my-git" },
    include: {
      analyticsEvents: {
        orderBy: { clickedAt: "asc" },
      },
    },
  });

  if (!link) {
    console.log("Link my-git not found.");
    return;
  }

  console.log(`Link: /${link.slug} (ID: ${link.id})`);
  console.log(`Max Clicks: ${link.maxClicks}`);
  console.log("Analytics Events:");
  link.analyticsEvents.forEach((event, i) => {
    console.log(`  [${i + 1}] ClickedAt: ${event.clickedAt.toISOString()} | Unique: ${event.isUnique} | UserAgent: ${event.userAgent?.substring(0, 50)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

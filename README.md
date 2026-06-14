# FLCut - An Advanced URL Shortener

FLCut is a powerful URL shortening app that has been created for the Finite Loop Club Hackfest 2026. FLCut provides more than just a simple way to shorten a link; it allows you to have scheduled lifetimes for your links, custom alias (aka "friendly") collision resolution, a click cap and fallback URL, visitor authentication requirements prior to redirecting users to the shortened URL, and a real-time tracking dashboard with pre-aggregated hourly telemetry.

Application URL: https://flcut.vercel.app
---
Code Repository: https://github.com/therealvishnuvardhan/FLCut

---

What FLCut Can Do for You

Shorten any long URL and make it into a nice clean and shareable link within the flcut.vercel.app domain
Provide a custom alias for your shortened links (for example: //flcut.vercel.app/hackfest26)
Set specific schedule for when your link will go live (be available to users) and when it expires (is no longer valid), even down to the minute
Limit the number of times a link will redirect and redirect any visitors to another (fall-back) URL if the click limit has been exceeded
Require authentication using Google before allowing an individual to be redirected to the link
Obtain real-time trackable statistics on every visit (total clicks, unique clicks by device, browser, OS, country, city, referrer, time series trends)
Create and manage links without having to "sign in", and the links created/managed are stored in the guest's browser local storage

---

## Prerequisites

Before running this locally, make sure you have the mentioned or else will be a trouble:

- Node.js version 18 or above
- npm (comes with Node.js)
- A PostgreSQL database (local instance or a cloud provider like Neon, Supabase, or Railway)
- An Upstash Redis instance (free tier is sufficient)
- A Google Cloud project with OAuth 2.0 credentials enabled

---

## Local Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/therealvishnuvardhan/FLCut.git
cd FLCut
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env` file in the root of the project. This file is not committed to the repository, so you need to create it manually. Add the following:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@hostname:port/database"

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_redis_token"

# Auth.js configuration
AUTH_SECRET="your_nextauth_secret_key"
AUTH_GOOGLE_ID="your_google_oauth_client_id"
AUTH_GOOGLE_SECRET="your_google_oauth_client_secret"

# Hashids configuration
HASHIDS_SALT="your_hashids_secret_salt"
HASHIDS_MIN_LENGTH=6

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

To generate a value for `AUTH_SECRET`, run this in your terminal:

```bash
openssl rand -base64 32
```

For Google credentials, go to console.cloud.google.com, create a project, enable the Google OAuth API, and add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI.

### Step 4: Set up the database

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

To inspect the database visually during development:

```bash
npx prisma studio
```

### Step 5: Start the development server

```bash
npm run dev
```

The app will be available at http://localhost:3000.

---

## Project Structure

```
FLCut/
├── prisma/
│   └── schema.prisma          # Full database schema
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── [slug]/            # Dynamic redirect route
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── track-hit/ # Background analytics endpoint
│   │   └── dashboard/         # Authenticated user dashboard
│   ├── components/            # Reusable UI components
│   └── lib/                   # Prisma client, auth config, utilities
├── next.config.ts
├── prisma.config.ts
├── .env                       # Environment variables (not committed)
└── package.json
```

---

## Deployment

To deploy your own instance:

1. Push the repository to GitHub.
2. Import the project into Vercel at vercel.com/new.
3. Add all environment variables from your `.env` file into Vercel project settings under Environment Variables.
4. Set `DATABASE_URL` to a production database, not your local one.
5. Set `NEXT_PUBLIC_APP_URL` to your production domain.
6. Add the production callback URL (`https://your-app.vercel.app/api/auth/callback/google`) to your Google OAuth app's authorised redirect URIs.
7. Vercel will build and deploy automatically.

---

## Data Model and Why It Is Designed This Way

The schema lives in `prisma/schema.prisma` and is split into four areas: authentication, core shortening, raw analytics, and aggregated telemetry.

**User, Account, Session, and VerificationToken** handle Google OAuth via Auth.js. The User model links to ShortLink so authenticated users can own and manage their links. These tables are standard Auth.js schema and are not custom.

**ShortLink** is the centre of the application. It stores the destination URL, the slug (unique, indexed for fast lookups), scheduling timestamps (`validFrom`, `validUntil`), a click cap (`maxClicks`), a fallback URL for when the cap is hit, and an `bypassAuth` toggle that controls whether visitors must sign in before being redirected. Everything the redirect handler needs to make a decision lives in this one row, so the redirect path is a single database read.

**AnalyticsEvent** is the raw click log. Every visit appends one row containing the link ID, timestamp, whether the visit was unique (`isUnique`), the user agent string, country, and city. This table has a composite index on `[linkId, clickedAt]` to keep dashboard queries fast even as the table grows.

**HourlyAggregate** is the pre-computed rollup table. It stores total click counts and unique click counts grouped by `linkId` and `timeBucket` (the timestamp rounded to the nearest hour), with a unique composite index on `[linkId, timeBucket]`. When a visitor redirects, a background job upserts into this table, incrementing the counters for that hour. The dashboard reads from this table rather than scanning and counting millions of raw AnalyticsEvent rows, which means chart rendering stays fast regardless of traffic volume.

The separation between AnalyticsEvent and HourlyAggregate is intentional. AnalyticsEvent is the audit trail: it has every individual visit with full detail. HourlyAggregate is the query layer: it answers "how many clicks per hour this week" in one indexed read instead of a full table scan. Writing to both on every redirect is cheap because the upsert runs in the background via the Next.js `after()` API and does not block the redirect response.

---


---

## Features in Detail

**Custom Aliases** — Choose your own slug like `/hackfest26` or `/workshop-rsvp` at creation time. Slugs must be between 3 and 30 characters and contain only alphanumeric characters, hyphens, and underscores.

**Validity Scheduling** — Set a `validFrom` and `validUntil` timestamp. The link will not redirect before the start time or after the end time. No manual toggling required: create the link on Monday, share it immediately, and it activates itself on Friday at 6pm.

**Click Caps with Fallback** — Set a `maxClicks` limit. Once the cap is reached, overflow visitors are sent to a `fallbackUrl` (for example a waitlist form) rather than seeing a dead page. If no fallback is set, they see a friendly inactive page.

**Visitor Authentication** — The `bypassAuth` toggle controls whether visitors must authenticate via Google before being redirected. When authentication is required, unauthenticated visitors are taken through the sign-in flow and then forwarded to the destination.

**Real-Time Analytics** — The dashboard reads from HourlyAggregate for time-series charts and from AnalyticsEvent for per-visit breakdowns. It shows total clicks, unique clicks, referrer sources, device types, browsers, operating systems, and geographic distribution by country and city.

**Guest Mode** — Visitors who are not signed in can still create and use short links. Their links are stored in browser local storage and visible on the landing page. Signing in upgrades them to a persistent dashboard with full analytics.

**Sync Clicks Button** — Modern browsers often throttle or completely pause background intervals when a tab is put in the background or the computer sleeps. A manual button lets you wake it up and force and sync clicks instantly.

---

## Core Challenge Solutions

### 1. Custom Aliases & Collision Resolution
FLCut allows users to define custom short link slugs. When users request custom slugs, they are validated against several constraints:
- Length: Must be between 3 and 30 characters.
- Format: Must contain only alphanumeric characters, hyphens, and underscores.
- Reserved Words: Slugs like admin, api, login, auth, and sitemap are blocked to prevent hijacking of system routes.
- Content Moderation: A profanity filter using the obscenity package blocks inappropriate words to protect the domain's reputation.

#### Collision Suggestions
If a user requests an alias that is already taken, the database unique constraint throws a P2002 error code. Instead of throwing a generic error, FLCut catches the conflict and automatically generates three available suggestions:
- Suffix Appending: It appends common templates like -flc, -rsvp, -2026, or -go.
- Random Appending: If suffix combinations are taken, it appends random 3-digit numbers.
- Availability Verification: The generator checks the database to verify the suggestions are vacant before returning them, ensuring the user gets working alternatives immediately.

#### Auto-Generated Slugs
When no custom alias is provided, the API generates a short code. To prevent collisions under heavy traffic, we query the PostgreSQL database sequence nextval('short_links_id_seq') to retrieve an atomic, unique sequential ID. 

This number is then encoded using Hashids with a custom secret salt. This method ensures:
- Clean, short alphanumeric codes.
- Zero collisions, since every sequence value is unique.
- Non-guessable paths, hiding the auto-increment database sequence from the end user.

### 2. Scheduled & Expiring Links
Event links often have strict active windows. FLCut enforces expiration and traffic caps through a middleware-free redirection handler located in the dynamic [slug] route:

- Scheduled Activation (validFrom): Before the go-live timestamp, visitors are redirected to an inactive page notifying them that the link is not yet active.
- Expiration Time (validUntil): Once the end timestamp passes, redirects are blocked and visitors land on an inactive page explaining that the link has expired.
- Click Caps (maxClicks): If a limit is set, the page queries the click count from the database. Once the limit is met, all subsequent hits are redirected to the inactive landing page instead of the destination.
- Optional Authentication (bypassAuth): When toggled off, visitors must authenticate via Google before they are redirected to the target URL. This ensures only logged-in members can access specific event links.

### 3. Smart Analytics & Telemetry
Analytics tracking should not slow down the redirect experience for the end user. FLCut separates redirect rendering from database logging.

#### Telemetry Flow
When a user visits a short link, the server resolves the dynamic slug and immediately renders a client-side redirection splash card. This card initiates the redirect using a client-side timer while sending telemetry data in the background using navigator.sendBeacon (or fallback fetch keepalive) to `/api/v1/track-hit`. 

On the server side, `/api/v1/track-hit` processes the request using the Next.js after() API. This allows the server to respond with a 202 Accepted status immediately, handing off the database writes (raw log insertion and hourly aggregation upserts) to run in the background.

---

## Design Questions & Decisions

### 1. Data Model Rationale
Our schema was structured to balance raw visitor logging with query performance. Rather than scanning and counting millions of individual click rows on every dashboard load, the HourlyAggregate table acts as a pre-computed rollup. By writing to this rollup table in the background using after(), the user dashboard loads in milliseconds even for high-traffic links.

### 2. If you only had 4 hours, what would you build first, and what would you cut?
If time was constrained to 4 hours, the priority would be the minimum viable redirect engine:
- Built First: Sequential sequence-based short code generation (using Hashids), basic database storage for slug-to-URL mapping, and the dynamic redirect route.
- What to Cut: The Google OAuth sign-in flow (using local storage to save created links for anonymous users), the edit link modal, interactive charts on the analytics page, and geographical header resolution.

### 3. Name one tradeoff you made and what you gave up.
Tradeoff: Browser-Based Cookie Tracking for Uniqueness.
Uniqueness is determined by checking for a browser-specific cookie (flc_visit_ [slug]). If a visitor opens the same link on a different browser, opens it in incognito mode, or clears their cookies, they will be counted as a new unique visit.
- What We Gave Up: Persistent device fingerprinting or IP hashing.
- Rationale: IP address storage introduces privacy compliance concerns (such as GDPR), while canvas fingerprinting is blockable and can degrade page load performance. Using browser cookies is standard, lightweight, and respects user privacy while remaining accurate enough for standard event metrics.

### 4. Assumptions made because the PRD did not say

**Who can create links.** The PRD described a tool for club events but did not say whether link creation is for organisers only or anyone. The assumption was that anyone should be able to shorten links without signing up, with local storage tracking so guest users see their links on the landing page. Signing in is required only for persistent management and analytics.

**The inactive link experience.** Rather than returning a generic 404 when a link is expired, capped, or not yet active, FLCut shows a branded page explaining specifically why the link is unavailable. This was assumed to be a better user experience even though the PRD did not specify it.

**Profanity filtering.** Public custom slugs are vulnerable to abuse since they appear as part of the domain. A profanity filter was added to prevent inappropriate words from being bound to the flcut domain without any explicit PRD requirement.

**Collision suggestions.** Returning a raw error on slug collision would feel broken to a user who spent time picking a name. The suggestion engine was built on the assumption that giving users three working alternatives immediately is a significantly better experience than telling them to try again and figure it out themselves.



#### Metrics Captured
- Total vs Unique Clicks: We set a cookie (flc_visit_ [slug]) on the visitor's browser for 24 hours. If the cookie is present, isUnique is set to false. If the cookie is absent, it is logged as unique.
- Geography: Geolocation (Country and City) is resolved via Vercel Edge Headers (x-vercel-ip-country and x-vercel-ip-city) which are populated by Vercel edge routers.
- User Agent Parsing: We parse and naviage user agent to categorize visits by Device (Mobile, Tablet, Desktop), Browser (Chrome, Safari, Firefox, Edge, Opera), and Operating System (iOS, Android, Windows, macOS, Linux).
- Bot and Scraper Filtering: To avoid inflating click logs, we can match user agent strings against common bot patterns (e.g. Googlebot, Twitterbot, Discordbot, Bingbot). If a scraper is detected, the event can be ignored or flagged, preventing artificial traffic spikes.

## Design Decisions and Tradeoffs

### The one core tradeoff: browser cookies for uniqueness

Uniqueness is determined by a browser cookie, not by IP address or device fingerprint. If the same person opens a link in a different browser, uses incognito mode, or clears their cookies, they are counted as a new unique visitor.

What was given up is cross-browser and cross-device accuracy. What was gained is simplicity, no IP address storage (which avoids GDPR exposure), and a behaviour that matches what most analytics tools including Google Analytics use by default. For a hackfest tool measuring event registrations, this is accurate enough.


## Live Demo

The hosted version is available at https://flcut.vercel.app.

You can shorten a link without signing in. Signing in with Google unlocks the full dashboard with analytics, link management, and the ability to edit or deactivate links after creation.

---


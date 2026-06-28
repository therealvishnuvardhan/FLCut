# LinkChop - Dynamic URL Shortener & Telemetry Console
## Comprehensive Interview Preparation Guide

This guide is structured to help you ace your interview by walking you through the project architecture, code linkages, and essential technical questions (ranging from Next.js and React basics to PostgreSQL, Redis, and security protocols).

---

## Part 1: How to Start the Interview (The Elevator Pitch)

Start your presentation by setting the context, stating the problem, and explaining how your system solves it.

### 1. The Opening Hook
"Hello. Today I am presenting LinkChop, which is a highly optimized, dynamic URL shortener and telemetry console. I built this project to go beyond basic link redirection and solve three core engineering challenges: custom slug collision management, scheduled link lifetimes, and non-blocking visitor analytics tracking."

### 2. The Tech Stack
"To achieve this, I chose a modern, full-stack architecture:
- Framework: Next.js (App Router) with TypeScript for clean, type-safe API boundaries and server-side rendering benefits.
- Styling: Tailwind CSS v4 for a premium, lightweight dark/light theme interface.
- Core Database: PostgreSQL (neon.tech serverless Postgres) mapped via Prisma ORM for relational schemas.
- Caching/Metrics: Upstash Redis for high-throughput, low-latency bot counter tracking.
- Authentication: Auth.js (NextAuth v5) for Google OAuth integration."

### 3. The Core Value Proposition
"What makes LinkChop unique is that it operates as a low-latency gateway. Redirections take less than 50 milliseconds because we offload heavy database writes, user-agent parsing, and geolocation lookups into a background thread. Additionally, it has a built-in bot and scraper blocker that filters out search engines and social card crawlers, counting only authentic human interaction on the dashboard."

---

## Part 2: End-to-End System Flows & Code Linkages

Here is how the files and functions link together when a user interacts with LinkChop.

### Flow A: Creating a Short Link (From Button Click to Database)

```
[UI Dashboard /app]
       │
       ▼ (1) User fills long URL + options, clicks "Shorten Link"
  handleSubmit()
       │
       ▼ (2) POST request with JSON payload
  fetch("/api/shorten") ────► [src/app/api/shorten/route.ts]
                                      │
                                      ▼ (3) Validation Checks
                                 Length, Profanity, Reserved Words
                                      │
                                      ├─► taken? ──► Catch P2002 ──► Generate Suggestions ──► Return 409
                                      │
                                      ▼ (4) If Available / Auto-Gen
                                 Prisma Create / Sequence + Hashids
                                      │
                                      ▼ (5) Return 201 Created JSON
                                  [UI updates list/local storage]
```

1. **The User Input**:
   - The user opens `src/app/app/page.tsx`. They type a destination URL (e.g., `google.com`) and choose an optional custom slug (e.g., `my-link`).
   - They click the **Shorten Link** button, triggering the form submission handler `handleSubmit` in `src/app/app/page.tsx`.

2. **The API Request**:
   - `handleSubmit` sends a `POST` request to `/api/shorten` (handled by `src/app/api/shorten/route.ts`).
   - The request payload contains: `longUrl`, `customSlug`, `validFrom`, `validUntil`, `maxClicks`, `fallbackUrl`, and `bypassAuth`.

3. **Validation & Content Moderation**:
   - Inside `src/app/api/shorten/route.ts`, the backend validates the URL format.
   - If a custom slug is provided, it validates character constraints and checks if the word is blocked. It runs the slug through a profanity filter using the `obscenity` package.
   - It also checks against `RESERVED_SLUGS` (like `admin`, `api`, `login`) to make sure the user does not override system paths.

4. **Collision Handling & Suggestions**:
   - If the custom slug already exists in the database, the Postgres database throws a unique constraint violation. Prisma catches this (error code `P2002`).
   - The route handler catches this error and calls `generateUniqueSuggestions(slug)`. It generates three alternative slugs (e.g. `my-link-chop`, `my-link-2026`) and checks the database to verify their availability. It responds to the client with a `409 Conflict` status containing these suggestions.
   - If no custom slug was provided, the backend generates one. It retrieves a unique, sequential number from the database sequence (`nextval('short_links_id_seq')`) and encodes it using `Hashids`. This guarantees 100% collision-free slugs without needing recursive lookups.

5. **Database Write**:
   - The backend creates the link record via `db.shortLink.create()` and returns the link object with a `201 Created` status code.
   - The frontend receives the link and updates the dashboard state (`myLinks`), causing the UI to re-render. If the user is not signed in (guest mode), the slug is saved to the browser's `localStorage` (`linkchop_local_slugs`).

---

### Flow B: Visiting a Short Link (From REDIRECT to TELEMETRY)

```
 [User Browser] ───► http://localhost:3000/[slug]
                                │
                                ▼
                       [src/app/[slug]/page.tsx]
                                │
                                ├─► Constraint check fails? ──► Redirect to /inactive
                                │
                                ▼ (Passes checks)
                       Render client-side RedirectSplash
                                │
                       ┌────────┴────────┐
                       ▼ (Client side)   ▼ (Background Network Request)
               Timeout redirects user     navigator.sendBeacon("/api/v1/track-hit")
             to longUrl after 1500ms             │
                                                 ▼
                                    [src/app/api/v1/track-hit/route.ts]
                                                 │
                                                 ▼ (1) checkIsBot(userAgent)
                                             Yes? ──► redis.incr() ──► Return 202
                                                 │
                                                 ▼ (2) Geolocation (Vercel IP headers)
                                                 │
                                                 ▼ (3) after() Background Queue
                                            Prisma AnalyticsEvent & HourlyAggregate
                                                 │
                                                 ▼ (4) Return 202 Accepted to Client
```

1. **Constraint Evaluation (Server-Side Component)**:
   - A visitor clicks a link like `linkchop.vercel.app/my-link`. The request goes to the server-side dynamic route `src/app/[slug]/page.tsx`.
   - The server queries the database: `db.shortLink.findUnique({ where: { slug } })`.
   - The server evaluates three constraints:
     - **Time Bounds**: Checks if the current time is before `validFrom` (not active yet) or after `validUntil` (expired).
     - **Click Cap**: Queries the click count for the link. If `clicks >= maxClicks`, the cap is exceeded.
     - **Authentication Requirement**: If `bypassAuth` is `false`, the server checks if the visitor has a logged-in session.
   - If any bound check fails, the visitor is redirected to `/inactive?reason=...`.

2. **Redirection Splash Render**:
   - If the checks pass, the page renders the client component `RedirectSplash` in `src/app/[slug]/RedirectSplash.tsx`.
   - The component sets a 24-hour browser cookie (`flc_visit_[slug]`) to check for visit uniqueness. If the cookie is present, `isUnique` is set to `false`; if absent, it is `true`.

3. **Background Telemetry Transmission**:
   - The client browser gathers the visitor's `navigator.userAgent` and the cookie state.
   - It fires a non-blocking background POST request to `/api/v1/track-hit` containing `linkId`, `slug`, `isUnique`, and `userAgent`.
   - This request uses `navigator.sendBeacon()` (or falls back to `fetch` with `keepalive: true`), ensuring the telemetry payload is sent even if the visitor closes the tab or redirects immediately.
   - Meanwhile, a client-side timer calls `window.location.replace(longUrl)` after 1.5 seconds, redirecting the user to their destination.

4. **Telemetry Ingestion & Bot Filtering**:
   - The POST request hits `src/app/api/v1/track-hit/route.ts`.
   - **Bot Check**: The backend runs `checkIsBot(userAgent)`. If it matches automated keywords (like `googlebot`, `discordbot`, `headless`), it runs `redis.incr("link:[slug]:bots")` in the background to log the blocked hit, and returns a `202` response early without writing to PostgreSQL.
   - **Geolocation Lookup**: The server extracts Vercel edge IP headers (`x-vercel-ip-country` and `x-vercel-ip-city`) to resolve the visitor's country and city.
   - **Non-blocking DB Writes (`after`)**: The backend wraps PostgreSQL writes in the Next.js `after()` API. This sends a `202 Accepted` response back to the client immediately. In the background:
     - It creates a row in the `AnalyticsEvent` table.
     - It calculates the current hourly bucket (rounding the current time to the top of the hour) and performs an `upsert` on the `HourlyAggregate` table (incrementing `clicks` and `uniqueClicks`).

---

### Flow C: Viewing Analytics (Loading and live-updating stats)

```
[UI Analytics page.tsx] ────► fetch("/api/analytics/[slug]") ────► [api/analytics/[slug]/route.ts]
         ▲                                                                     │
         │                                                                     ▼
         │                                                                Prisma query +
         └───────────────── Returns payload + botClicks ───────────────── Redis get()
```

1. **Dashboard Load**:
   - The user opens `src/app/analytics/[slug]/page.tsx`.
   - The component runs `fetchAnalytics("loading")` inside a `useEffect` hook.

2. **API Data Aggregation**:
   - The request hits `src/app/api/analytics/[slug]/route.ts`.
   - The backend queries PostgreSQL for the link details, all its `analyticsEvents`, and its `hourlyAggregates`.
   - It queries Upstash Redis for `link:[slug]:bots` to get the count of blocked scraper hits.
   - It merges these values and returns the complete payload to the client.

3. **Client Aggregation & Chart Rendering**:
   - The frontend parses the `userAgent` strings to group visits by device type, operating system, and browser.
   - It calculates unique ratio percentages.
   - It uses the events data to build a 7-day daily click count list and renders it as an SVG graph.
   - It sets up a 5-second interval timer. Every 5 seconds, it calls `fetchAnalytics("silent")`, which fetches updated counts in the background and updates the UI without displaying loading screens.

---

## Part 3: Deep Dive Walkthrough of Key Files

### 1. [prisma/schema.prisma](file:///f:/FLCut/prisma/schema.prisma)
This is the database schema definition file.
- **`ShortLink`**: Represents a shortened link. It contains standard columns like `slug`, `longUrl`, and metadata columns like `validFrom`, `validUntil`, `maxClicks`, `fallbackUrl`, `bypassAuth`.
- **`AnalyticsEvent`**: Logs raw individual click records. It holds foreign keys referencing `ShortLink`, geolocations, and the user agent. It has a composite index `@@index([linkId, clickedAt])` to optimize queries sorting by timestamp.
- **`HourlyAggregate`**: Pre-aggregates clicks into hourly buckets. By tracking counts directly in `clicks` and `uniqueClicks` fields keyed on a composite unique identifier `@@unique([linkId, timeBucket])`, we avoid doing heavy row-scanning query counts on Postgres when rendering the charts.

### 2. [src/app/api/shorten/route.ts](file:///f:/FLCut/src/app/api/shorten/route.ts)
This is the URL creation API endpoint.
- Uses `auth()` to identify if a creator is logged in.
- Performs validation on the target URL.
- Cleans and checks custom slugs against `RESERVED_SLUGS` and `hasProfanity` rules.
- If a custom slug conflict occurs (Prisma `P2002` error), it suggests three unique slugs using suffix appending or random number generation.
- If no slug is specified, it uses a PostgreSQL sequence (`SELECT nextval('short_links_id_seq')`) and encodes it with `Hashids` to guarantee unique, short, and non-guessable paths.

### 3. [src/app/api/v1/track-hit/route.ts](file:///f:/FLCut/src/app/api/v1/track-hit/route.ts)
This is the background analytics ingestion endpoint.
- Uses a `checkIsBot()` helper to inspect user agents against crawlers and scrapers. If a bot is matched, it increments a counter in Upstash Redis and returns a `202` response early to block database pollution.
- Resolves geographical headers supplied by Vercel's edge network.
- Wraps the DB updates inside the Next.js `after()` API to perform non-blocking asynchronous inserts and upserts in the background after the client response has been returned.

### 4. [src/app/analytics/[slug]/page.tsx](file:///f:/FLCut/src/app/analytics/[slug]/page.tsx)
This is the dashboard visualization page.
- Utilizes React hooks (`useState`, `useEffect`) to fetch telemetry data on mount.
- Parses user-agent strings using a local parser to extract browser type, device type, and operating system.
- Groups events by country flag code and city name.
- Renders an SVG bar chart by grouping clicks into daily blocks starting from the link creation date.
- Employs a 5-second interval to fetch telemetry silently in the background, updating click charts and counters in real-time.

---

## Part 4: 100 Interview Questions & Answers

### Next.js Basics & Architecture
1. **What is Next.js?**
   Next.js is a React framework for building server-rendered and statically generated web applications. It includes built-in routing, optimization compilers, and API route support.
2. **What is the difference between Next.js Pages Router and App Router?**
   Pages Router uses the `pages` directory and is file-system based. App Router uses the `app` directory, supports React Server Components (RSC) by default, nested layouts, and loading/error states.
3. **What are React Server Components (RSC) in Next.js?**
   Server Components are rendered on the server instead of the browser. They reduce the amount of JavaScript sent to the client, improving page load speeds and SEO.
4. **How do you make a component a Client Component in Next.js?**
   By placing the `"use client"` directive at the very top of the file. This tells Next.js to compile it for execution on the client side, enabling React hooks and event handlers.
5. **Why does LinkChop use `"use client"` in its pages?**
   Because pages like the landing page, dashboard, and analytics page use interactive React state (`useState`, `useEffect`), theme context, form validation, and event handling.
6. **What is SSR (Server-Side Rendering)?**
   SSR renders the HTML of a page on the server for each request. It ensures search engines crawl fully populated pages, providing excellent SEO.
7. **What is SSG (Static Site Generation)?**
   SSG pre-renders the HTML of a page at build time. The static page is cached by CDN edges and served instantly to visitors.
8. **What is ISR (Incremental Static Regeneration)?**
   ISR allows you to update static pages in the background after the site is built, regenerating them when a request comes in after a specified timeout.
9. **What does `export const dynamic = "force-dynamic"` do?**
   It disables caching for a route, forcing Next.js to render the page dynamically on every request. This is critical for redirection routing where we need real-time constraint validation.
10. **What is the Next.js `after()` API?**
    It is a Next.js utility that schedules a function to execute in the background after the server response has been completed and sent to the browser.
11. **Why does LinkChop use `after()` in the tracking API?**
    It offloads database writes and counts so they run in the background. The client browser is sent the redirect response instantly without waiting for SQL queries to finish.
12. **What is the middleware in Next.js?**
    Middleware runs code before a request is completed. It allows you to intercept requests, inspect headers, and perform redirects or rewrites.
13. **What does the middleware in LinkChop do?**
    It intercepts requests going to `/dashboard` and redirects unauthenticated users to `/auth/login`, protecting the user dashboard routes.
14. **How does routing work in Next.js App Router?**
    Folder names define the URL path structure. A file named `page.tsx` inside a folder represents the UI for that path.
15. **What is a dynamic route in Next.js App Router?**
    A route containing a bracketed folder name, like `[slug]/page.tsx`. Next.js extracts the dynamic value from the URL and passes it as a parameter to the page.
16. **How does LinkChop handle redirections dynamically?**
    It uses a fallback dynamic route `[slug]/page.tsx` at the root of the app folder. Any URL path (like `linkchop.vercel.app/my-link`) matches this dynamic route and fetches the target redirect URL.
17. **What is the purpose of the `layout.tsx` file?**
    It defines a shared layout structure for nested pages. It is wrapped around pages and child layouts, preserving state and avoiding full page refreshes.
18. **Why does LinkChop use `SessionProvider` in `layout.tsx`?**
    It wraps the application in NextAuth's context, letting all client components access the visitor's authentication state via hooks.
19. **What is `NextResponse.json`?**
    A Next.js helper that creates a standard HTTP response with a JSON payload and automatically sets the `Content-Type: application/json` header.
20. **How does Next.js handle API routes?**
    By putting files named `route.ts` inside API folders. You define exported functions matching HTTP methods (like `GET`, `POST`, `PATCH`, `DELETE`) to handle incoming requests.

### React, TypeScript & Styling (Tailwind)
21. **What is React?**
    React is a JavaScript library for building user interfaces using components and declarative state updates.
22. **What is the Virtual DOM?**
    A lightweight, in-memory representation of the real DOM. React updates the Virtual DOM first, calculates differences, and applies minimal updates to the real DOM.
23. **What is `useState` hook?**
    A hook that allows you to add state variables to functional components. Changing state triggers a component re-render.
24. **What is the `useEffect` hook?**
    A hook used to perform side effects in functional components, such as data fetching, setting timers, or subscribing to events.
25. **How does the cleanup function in `useEffect` work?**
    A function returned inside `useEffect` that runs when the component unmounts or before the effect runs again, cleaning up resources like intervals or event listeners.
26. **What is React Context API?**
    A way to share data globally across the component tree without passing props down manually through multiple levels.
27. **How does `ThemeProvider` work in LinkChop?**
    It creates a theme context, holds the dark/light state, and adds/removes the `.dark` class on the HTML root element.
28. **What is hydration in React?**
    The process where client-side React attaches event listeners to static HTML sent by the server, turning it into an interactive app.
29. **What causes a hydration mismatch warning in Next.js?**
    When the HTML rendered on the server differs from the HTML computed by the client during initial render (e.g., using client-only state variables before mounting).
30. **How did we solve hydration mismatches in `ThemeProvider.tsx`?**
    By checking a `mounted` state inside `useEffect` and delaying the rendering of client-dependent elements (like background grids) until after mount.
31. **What is TypeScript?**
    A typed superset of JavaScript that adds static types, helping catch errors during development.
32. **What is an interface in TypeScript?**
    A declaration that defines the structural contract/shape of an object, specifying properties and their types.
33. **Why do we define interfaces like `ShortLink` and `AnalyticsEvent`?**
    To ensure type safety when fetching and manipulating database objects in both API routes and frontend dashboard states.
34. **What does the `ReadOnly<{ children: React.ReactNode }>` type mean in layouts?**
    It indicates that the layout component takes a child component property that cannot be modified.
35. **What is Tailwind CSS v4?**
    A utility-first CSS framework that compiles stylesheets using a modern engine, focusing on inline performance and native CSS variables.
36. **What is glassmorphism in web design?**
    A UI trend that mimics frosted glass, achieved using transparent backgrounds, borders, and backdrop filters (`backdrop-blur`).
37. **What Tailwind classes did we use to build the glassmorphism navbar?**
    `bg-neutral-950/60` (dark background with 60% opacity), `backdrop-blur-xl` (heavy background blur), and `border-violet-900/20` (subtle border accent).
38. **What is responsive design in Tailwind?**
    Using breakpoint prefixes (like `sm:`, `md:`, `lg:`) to apply utility styles conditionally based on the visitor's screen width.
39. **Why did we use `hidden sm:inline` for the signed-in user name?**
    To show the name text only on screen sizes larger than 640px. On mobile, the text is hidden to save navbar space, showing only the avatar image.
40. **How does Tailwind v4 handle dark mode?**
    Using the `@custom-variant dark` rule, applying classes prefixed with `dark:` when a `.dark` class is present on a parent element.

### Database, Prisma & Caching (Redis)
41. **What is Prisma?**
    Prisma is a modern Object-Relational Mapper (ORM) that lets developers query databases using a type-safe API based on a schema file.
42. **What is a database migration?**
    A version-controlled script that updates the physical database schema to match modifications made in the schema code.
43. **What does `npx prisma db push` do?**
    It synchronizes the database schema directly with the Prisma schema without generating migration files, ideal for rapid local prototyping.
44. **What is a PostgreSQL sequence?**
    A database object that generates sequential integers, often used to create auto-incrementing primary keys.
45. **Why did we query the sequence `short_links_id_seq` directly?**
    To get a unique ID atomically before writing to the database, allowing us to encode it using Hashids without risking collisions.
46. **What is `db.shortLink.findUnique()`?**
    A Prisma query that searches for a single database record matching an indexed, unique column (like the slug).
47. **What is a database index?**
    A data structure built on a database table column to speed up searches, lookups, and sorting operations.
48. **Why does `AnalyticsEvent` have `@@index([linkId, clickedAt])`?**
    It creates a composite index, optimizing the speed of queries fetching click logs for a specific link sorted by creation date.
49. **What is a database upsert?**
    A database operation that updates an existing record if it matches a unique constraint, or inserts a new record if it does not exist.
50. **How does `HourlyAggregate.upsert` work in LinkChop?**
    It searches for a record with matching `linkId` and `timeBucket`. If found, it increments `clicks`; if not, it creates a new record with initial values.
51. **Why is pre-aggregation better than real-time counting?**
    Counting millions of rows on every page load causes slow database queries. Pre-aggregating data hourly means we only fetch a few pre-computed rows, keeping chart renders fast.
52. **What is Redis?**
    An in-memory data store used as a database, cache, and message broker, known for sub-millisecond read/write speeds.
53. **What is Upstash Redis?**
    A serverless Redis database offering HTTP rest APIs, perfect for serverless platforms like Vercel.
54. **Why do we use Redis for bot tracking instead of PostgreSQL?**
    Bots generate a lot of traffic. Saving bot clicks in Postgres would bloat tables. Incrementing a simple integer counter in Redis is extremely fast and light.
55. **How does `redis.incr()` work?**
    An atomic Redis operation that increments the integer value of a key by `1`. If the key does not exist, it initializes it to `0` and then increments it.
56. **What key structure do we use in Redis for bots?**
    `link:[slug]:bots` (e.g. `link:my-link:bots`), separating keys cleanly for different links.
57. **How does the analytics API get the bot click count?**
    By querying Upstash Redis using `redis.get("link:[slug]:bots")`, parsing it, and merging it into the JSON payload returned to the client.
58. **What happens if Redis goes down during a redirect?**
    We wrap the Redis query in a `try/catch` block. If it fails, we log the error but still let the redirect function normally.
59. **Why is the database client exported as a global variable in `src/lib/db.ts`?**
    Next.js hot-reloads modules. Storing the Prisma client on a global object prevents the app from creating multiple active database connections during development.
60. **What does `onDelete: Cascade` mean in database relations?**
    It specifies that if a parent record (like a `ShortLink`) is deleted, all its child records (like its `AnalyticsEvent` and `HourlyAggregate` rows) are automatically deleted.

### Redirection, Scheduling & Analytics
61. **How does dynamic redirection work in Next.js?**
    The server intercepts requests at `/[slug]`, checks the slug against the database, and uses `redirect(longUrl)` to send a `307 Temporary Redirect` status.
62. **Why does LinkChop use a client-side splash page for redirection instead of a pure server redirect?**
    To gather telemetry. Browsers do not execute JavaScript on a pure HTTP `307` server redirect, which means we would not be able to set client cookies or get user agents. The splash page handles this before redirecting.
63. **What is `navigator.sendBeacon`?**
    A browser API designed to send small telemetry data to a server asynchronously without waiting for the response, continuing even if the page redirects or closes.
64. **Why does the telemetry script fall back to `fetch` with `keepalive: true`?**
    Some older browsers do not support `navigator.sendBeacon`. The `keepalive` fetch flag keeps the request alive even after the page is closed.
65. **How does LinkChop determine if a click is unique?**
    By setting a cookie (`linkchop_visit_[slug]=1`) on the visitor's browser for 24 hours. If the cookie is present, the visit is not unique.
66. **What is a cookie?**
    A small piece of data sent from a website and stored on the user's computer by their web browser while they are browsing.
67. **What is the difference between `SameSite=Lax` and `SameSite=Strict` cookies?**
    `Strict` cookies are only sent in first-party contexts. `Lax` cookies are also sent when a user navigates to the origin site from an external link, making it ideal for tracking short URL visits.
68. **How do we get geolocation details for clicks?**
    By reading Vercel's edge network headers (`x-vercel-ip-country` and `x-vercel-ip-city`), which translate the visitor's IP address into location data.
69. **How do we parse the user agent?**
    By inspecting the `navigator.userAgent` string, checking for keywords like `iPhone` or `Android` to identify devices, and browser names like `Chrome` or `Safari`.
70. **How does LinkChop support future-scheduled links?**
    By validating `validFrom`. If the current time is before `validFrom`, the server blocks the redirect and routes the user to the inactive pending page.
71. **How do we handle link expiration?**
    By checking `validUntil`. If the current time is past `validUntil`, the redirect is blocked and the visitor is redirected to the expired page.
72. **How do capped links work?**
    If a link has `maxClicks`, the server runs a count query. If the total clicks equal or exceed this cap, the redirect is blocked.
73. **What is the `fallbackUrl`?**
    An optional URL configured by the link creator. If a link is expired or click-capped, LinkChop forwards the visitor here instead of showing the inactive page.
74. **How are daily clicks aggregated for the SVG chart?**
    The client groups events by date starting from the link's creation date. It maps the counts into a 7-day view.
75. **How does the SVG chart scale dynamically?**
    It calculates the maximum clicks in the current 7-day period and uses this value to calculate relative heights (`(count / maxCount) * 100`) for the SVG bars.
76. **How does the 5-second automatic update work?**
    Inside `useEffect`, we set an interval that runs every 5 seconds, calling the analytics API silently in the background and updating state variables.
77. **Why do we use a silent update instead of a full loading screen for polling?**
    A full loading screen replaces the entire page with a spinner every 5 seconds, which would ruin the user experience.
78. **What happens if a user is editing a link while a background sync happens?**
    The edit inputs use separate React states (`editLongUrl`, etc.), so background state changes do not reset or disrupt the user's input.
79. **How do anonymous guest users track their links?**
    Guest links are saved in the browser's `localStorage`. When the landing page mounts, it reads these slugs to fetch and show the guest's links.
80. **What is the difference between `localStorage` and `sessionStorage`?**
    `localStorage` data persists indefinitely until cleared. `sessionStorage` data is cleared when the browser tab is closed.

### Security, Authentication & Obscenity
81. **What is Auth.js?**
    Auth.js (formerly NextAuth.js) is a secure authentication library designed for Next.js, supporting OAuth providers, database adapters, and token sessions.
82. **What is OAuth 2.0?**
    An open standard protocol that lets applications obtain limited access to user accounts on HTTP services (like Google) without exposing passwords.
83. **How does Google OAuth work in LinkChop?**
    The user clicks Sign In, gets redirected to Google's consent screen, and logs in. Google returns an authorization code, which NextAuth exchanges for user profile tokens.
84. **What is a session cookie?**
    A cookie containing a session token. The browser sends it with every request, allowing the server to identify the authenticated user.
85. **Why does LinkChop support visitor authentication bypass?**
    Some links are public, while others contain sensitive event information. The bypass toggle lets organizers choose if visitors must log in first.
86. **How is the Google profile image displayed securely?**
    Using the `referrerPolicy="no-referrer"` attribute on the `<img>` tag, which prevents Google's servers from blocking image loads due to referrer restrictions.
87. **What is the `obscenity` package?**
    A JavaScript utility that matches profanity and slurs in text strings, supporting word variations and character substitutions.
88. **How does LinkChop use `obscenity`?**
    When a custom slug is requested, the server runs it through the obscenity regex matcher. If matched, it returns a `400 Bad Request` block.
89. **Why do we enforce content moderation on custom slugs?**
    To prevent users from associating offensive words with the application's domain, protecting the brand's reputation.
90. **What are reserved slugs?**
    A list of names like `api`, `dashboard`, `admin`, and `login` that are blocked during custom slug creation to prevent users from overriding core system paths.
91. **What is a unique constraint violation in a database?**
    A database error that occurs when a query tries to insert a row with a value in a unique column (like the slug) that already exists in the table.
92. **How does LinkChop handle slug conflicts?**
    By catching the Prisma `P2002` error and calling a suggestion generator, which returns three alternative available slugs.
93. **How are custom slug suggestions generated?**
    It appends common suffixes (like `-chop` or `-2026`) or random numbers to the base slug, checking their availability in the database before returning them.
94. **What is `openssl rand -base64 32` used for?**
    Generating a secure, random 32-byte key used as the `AUTH_SECRET` to encrypt next-auth session tokens.
95. **What is a callback URL in authentication?**
    The URL the authentication provider redirects the user back to after a successful login session is established.
96. **How does LinkChop protect backend API routes?**
    By checking `await auth()` at the top of protected route handlers. If no session exists, the API returns a `403 Forbidden` response.
97. **What is Hashids?**
    A library that generates short, unique, non-sequential hashes from numbers, allowing you to hide auto-incrementing database keys from URLs.
98. **Why did we choose Hashids over UUIDs for short links?**
    UUIDs are 36 characters long, which would make short URLs very long. Hashids converts database IDs into short, clean codes (like `3kL9a`), keeping paths short.
99. **How does the Hashids salt work?**
    It is a secret string used during encoding. Using a unique salt guarantees that the generated hashes are specific to your application and cannot be reverse-engineered.
100. **What is the Vercel edge network?**
     A distributed network of Vercel servers that processes requests close to the visitor's location, reducing response latency.

---

## Part 5: Pro-Tips for the Interview

1. **Be Honest About Tradeoffs**:
   - If they ask about session cookies for uniqueness, tell them: "Yes, using browser cookies is a standard tradeoff. It means a user opening the link on two different browsers counts as two unique clicks. We accepted this tradeoff to respect user privacy and avoid storing IP addresses under GDPR compliance."
2. **Emphasize Performance**:
   - Mention the Next.js `after()` API: "We chose to process telemetry in the background after the response is sent. This guarantees that visitors redirect to their destination in milliseconds, while analytics writes are processed asynchronously."
3. **Be Prepared to Show Code**:
   - If they ask to see how bot detection is handled, pull up `src/app/api/v1/track-hit/route.ts` and show the `checkIsBot` function and the early return block. It is clean and very easy to explain.
4. **Speak with Confidence**:
   - Explain *why* you made choices (e.g. why Redis was chosen for bot counters, why PostgreSQL was used for relational models). Showing a clear thought process behind your architecture is key to standing out.

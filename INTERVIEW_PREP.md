# FLCut Technical Interview Preparation Guide

This document tracks the technical architecture questions, system design details, and concurrency considerations discussed during the development of FLCut.

---

## 1. Core Redirection & Caching

### Q1: How does redirection work under the hood in FLCut?
* **Answer**: Next.js App Router uses folder-based dynamic routing. The directory `src/app/[slug]` acts as a wildcard parameter. 
When a user visits `flcut.club/my-slug`, the `GET` handler in `src/app/[slug]/route.ts` captures `slug = 'my-slug'`, queries the PostgreSQL database via Prisma (`db.shortLink.findUnique`), checks for scheduling/expiration, and returns an HTTP response containing a `302 Found` status with the target destination in the `Location` header. The browser reads this header and automatically redirects the tab.

### Q2: Why is the redirection status set to `302 Found` instead of `301 Moved Permanently`?
* **Answer**: A `301 Moved Permanently` status code tells the browser that the redirection is permanent. The browser will cache this redirection locally. If the browser caches it, future visits to the short link will redirect directly without hitting our server, making it impossible to enforce click caps, track analytics, or update the target URL. 
* A `302 Found` status tells the browser that the redirect is temporary, forcing the browser to check in with our server on every single visit.

### Q3: Why do we send cache-busting headers with the redirect?
* **Answer**: We explicitly set the `Cache-Control` header to `no-store, no-cache, must-revalidate, proxy-revalidate`. This completely destroys browser and intermediate proxy caches, ensuring that every link visit triggers a request to our servers, enabling real-time analytics and precise click cap checks.

---

## 2. Database & Connection Management

### Q4: Where is the destination URL physically stored in the database?
* **Answer**: It is stored in the PostgreSQL database inside a table named `short_links` under a column named `long_url`. 
In our Prisma schema, it is defined as:
```prisma
longUrl String @map("long_url")
```
The `@map` decorator ensures our TypeScript code uses clean `camelCase` (`longUrl`), while mapping it to database-standard `snake_case` (`long_url`).

### Q5: Why is the `slug` column defined with a `@unique` constraint?
* **Answer**: 
1. **Uniqueness**: It prevents ambiguity. If two short links had the same slug, the server wouldn't know where to redirect the visitor.
2. **Performance**: A `@unique` constraint instructs PostgreSQL to build a B-Tree index on the `slug` column. This index lets the database lookup paths in `O(log N)` logarithmic time instead of executing a slow, sequential full-table scan.

### Q6: Why did we use a PostgreSQL sequence (`SELECT nextval('short_links_id_seq')`) and Hashids instead of generating random strings?
* **Answer**: Generating a random string (like `Math.random()`) and saving it to the database introduces a **Read-Before-Write race condition**. Under high traffic, two servers might generate the same random string, check the DB, see it doesn't exist, and both try to write it, causing one to crash.
* By using a PostgreSQL sequence (`nextval`), the database handles serialization and returns a guaranteed unique incremental integer. We pass this integer to the **Hashids** library to mathematically encode it into a short, obfuscated slug. This requires zero check-before-write queries and has no risk of collision.

### Q7: Why do we instantiate the Prisma Client as a global singleton?
* **Answer**: Next.js automatically re-evaluates files during hot-reloading in local development. If we instantiated `new PrismaClient()` directly, a new database connection pool would be created on every file reload. This would quickly exceed the PostgreSQL database connection limit.
* By storing the client instance in `globalThis.prisma`, we preserve and reuse the single connection pool across hot reloads.

### Q8: What is the new Prisma 7 configuration file structure?
* **Answer**: In Prisma 7, the `url` property was deprecated inside the `datasource` block of `schema.prisma`. 
* Tooling (such as migrations and schemas) reads the database connection string from `prisma.config.ts`.
* Runtime execution code (like `db.ts`) must initialize `PrismaClient` by explicitly passing a driver adapter—such as `@prisma/adapter-neon` combined with `@neondatabase/serverless`—which provides performance benefits in serverless environments.

### Q9: Why did the Vercel deployment fail with a `Module not found` error for the database?
* **Answer**: By default, the generated Prisma Client lives inside the `src/generated/prisma` folder, which is git-ignored and not committed. During deployment, Vercel pulls the clean git repository and builds it. 
* If Vercel runs `next build` without generating the client first, the build fails because the imports cannot resolve. We solved this by changing the build script in `package.json` to `"build": "prisma generate && next build"`.

---

## 3. Tech Stack & Environment

### Q10: Why do we refer to Node.js when it isn't listed in the stack?
* **Answer**: Next.js is a full-stack React framework, but JavaScript cannot run on an operating system by itself. **Node.js** is the backend runtime environment that executes JavaScript outside of the browser. When the Next.js server runs locally or as serverless functions on Vercel, it is executing inside a Node.js process.

### Q11: What does the Next.js server-side do?
* **Answer**: It handles:
1. **Security**: Runs database queries securely without exposing the database credentials (`DATABASE_URL`) to the client browser.
2. **API Logic**: Hosts route handlers like `/api/shorten` to run validation, sequence fetching, and profanity checks.
3. **Pre-rendering (SSR)**: Generates HTML on the server for better SEO.
4. **Middleware & Redirects**: Intercepts requests immediately on the network edge and issues fast redirects.

---

## 4. Concurrency & Race Conditions (Phase 2)

### Q12: How do we handle click caps atomically using Upstash Redis?
* **Answer**: If we tracked clicks in a database using a read-increment-write cycle (e.g. reading current clicks, incrementing in code, then writing back), concurrent clicks would conflict. Two users could read `49` clicks and both write `50`, allowing 51 clicks in total.
* We solve this by using Upstash Redis's atomic **`INCR`** command:
  ```typescript
  const clicks = await redis.incr(`click_count:${slug}`);
  ```
  Since Redis processes operations on a single-threaded queue, every increment request is executed sequentially. It returns a guaranteed, sequential, unique post-increment integer to each request.

### Q13: If a link has a limit of 50, and 5 users click at the exact same millisecond when the count is 49, who is allowed to visit?
* **Answer**: Only the user whose request physically reaches the server's network interface first is allowed to visit.
* Even though they clicked "at the same time", factors like physical distance to the server and network packet routing jitter mean one packet will reach the server first.
* Redis queues them in order of network arrival:
  1. The 1st request increments the count from `49` to `50`. The code check `50 > 50` is `false`, so they are redirected.
  2. The 2nd request increments from `50` to `51`. The code check `51 > 50` is `true`, so they are blocked.
  3. The remaining requests increment the count to `52`, `53`, etc., and are all blocked.

### Q14: How are redirect errors (like expired or capped links) surfaced to the user?
* **Answer**: When a redirect fails, the server redirects the visitor back to the home page with error queries, e.g. `/?error=link_limit_reached&slug=my-slug`. 
* On mount, [page.tsx](file:///f:/FLCut/src/app/page.tsx) uses a client-side `useEffect` to parse `window.location.search`. It catches the error parameter, displays a styled warning banner, and runs `window.history.replaceState` to erase the parameters from the URL address bar so the page remains clean if refreshed.

---

## 5. Analytics Ingestion & Background Processing (Phase 3)

### Q15: How do we track unique vs. non-unique visits without cookies or accounts?
* **Answer**: We use the browser's **`sessionStorage`**. When a user lands on the dynamic splash screen, a client-side script checks if a key representing the slug exists (e.g. `sessionStorage.getItem('flc_route_my-slug')`):
  * **If not found**: It is the user's first visit in this browser tab session. We set `isUnique = true` and write `sessionStorage.setItem('flc_route_my-slug', '1')`.
  * **If found**: They have clicked the link in this session before. We set `isUnique = false`.

### Q16: What is `navigator.sendBeacon` and why is it preferred over a standard `fetch` call?
* **Answer**: `navigator.sendBeacon` is a browser API designed to send small telemetry payloads asynchronously to a server before the page unloads/redirects. 
* Unlike `fetch`, which can be cancelled by the browser if the page unloads (which would stop the analytics from writing when we run `window.location.replace`), `sendBeacon` queues the request in the browser's background thread. The browser guarantees the payload is sent even if the user has already navigated away from the site.

### Q17: What is the Next.js `after()` API and why is it crucial for redirection performance?
* **Answer**: Next.js `after()` (imported from `next/server`) schedules code to execute asynchronously *after* the HTTP response has been sent back to the browser.
* In our hit-tracking endpoint, the server immediately returns a `202 Accepted` response to the client's `sendBeacon` request. Next.js then runs the database writes (`AnalyticsEvent` insertion and `HourlyAggregate` updates) in the background. This keeps the client-side redirect time extremely low (10-20ms instead of 200ms).

### Q18: How do we capture the user's country and city?
* **Answer**: When deployed on Vercel, the platform automatically geolocates the client's IP address and appends the location as standard headers on the incoming HTTP request:
  * `x-vercel-ip-country`: Holds the country code (e.g., `US`, `IN`).
  * `x-vercel-ip-city`: Holds the city name (e.g., `Mumbai`, `New York`).
* In [route.ts](file:///f:/FLCut/src/app/api/v1/track-hit/route.ts), we read these headers and decode them (`decodeURIComponent`) to log them in our `AnalyticsEvent` table.

### Q19: How does the hourly aggregation work, and what role does the composite unique key play?
* **Answer**: Instead of counting raw logs to show click charts (which is slow for millions of clicks), we aggregate clicks into hourly buckets. We truncate the click time to the start of the hour (e.g., `10:00:00`).
* We use a composite unique constraint in Prisma: `@@unique([linkId, timeBucket])`.
* This allows us to perform a database **`upsert`** in a single query: if a bucket for that hour already exists, we increment the counters; if not, we create it. The unique key guarantees we never create duplicate buckets for the same hour.


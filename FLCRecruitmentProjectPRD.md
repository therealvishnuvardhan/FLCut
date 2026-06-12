F I N I T E  L O O P  C L U B · T E C H T E A M  R E C R U I T M E N T 2 0 2 6 - 2 7 ·  R O U N D 1 

T H U R S D A Y,  J U N E 1 1 2 0 2 6 

## FLCut The Round 1 Build Challenge 

Build us a link shortener for Finite Loop Club events, but the link shortener is not the point. We run hackathons, workshops, and talks all year, and we need short, smart, trackable links for registrations, resource drops, and feedback forms. Your job is to build that tool. Our job is to read how you think while you do it. We care far more about your judgment than your output: how well you understood the problem, what you choose to build, what you choose to skip, how you handle the tricky parts, and whether you can explain every decision you made. 


## I. The Context 

1. Who this is for 

FLC is a technical club that runs real events on a college campus. Every event spins up links we share across WhatsApp groups, posters, Instagram, and email: a registration form, a resources folder, a feedback form, a "join the Discord" invite. 

   - Those raw links are long, ugly, and impossible to track. We never know which channel actually drove signups. We can't reuse a clean link across editions of the same event. 

2. What FLCut is 

FLCut is our own Bitly, built for how FLC actually runs events. Shorten a link, optionally give it a memorable name, share it everywhere, and see what's working. That's the spine, and everything below is where the real thinking lives.

II. Core Requirements (Must Have) 

1. The basics 

Without these, it isn't a link shortener. Get these working before you touch anything fancy. 

- Paste a long URL, get back a short link. 

- Visiting the short link redirects to the original. 

- A simple dashboard listing the links you've created. 

- The whole thing is deployed and reachable from a public URL. 

## III. The Stack (Non-Negotiable) 

1. What you must build it with 

R E Q U I R E D 

We standardize our stack so projects stay maintainable after you hand them over. Stick to this, please. 

   - Next.js (or anything built on top of it). App Router preferred. 

   - TypeScript is a must. No plain JavaScript. 

   - PostgreSQL as the database. 

   - An ORM is required: Drizzle or Prisma, your pick. 

- Within these constraints, every other choice is yours. 

## IV. The Hard Problems (More the problems solved the better, but the basic mentioned above is must) 

1. Custom aliases & collisions 

C O R E  C H A L L E N G E 

   - Let people pick the slug: `flcut.finiteloop.club/hackfest26` . Easy until two people want the same one. 

      - How do you generate short codes when no alias is given: random, sequential, hashed? What are the tradeoffs? 

      - What happens when someone requests an alias that's already taken? 

      - Are there words you should reserve or block ( `admin` , `api` , slurs)? 

      - How do you guarantee two links never collide under load? 

2. Scheduled & expiring links 

C O R E  C H A L L E N G E 

Event links have a lifespan. Registration opens Friday 6pm and the event is over by Sunday. The link should behave accordingly. 

- A link can have a go-live time: before that, it shouldn't redirect. 

- A link can expire: after that, show a sensible page, not a broken redirect. 

- Bonus: capped links. "First 100 registrations, then send 

- everyone else to the waitlist." 

C O R E  C H A L L E N G E 

## 3. Smart analytics 

Anyone can count clicks. We want to know what's actually worth tracking. This is the most open-ended part on purpose. 

- Total clicks vs. unique clicks, and you decide what "unique" even means. 

- Break clicks down by referrer, device, and rough location. 

- A time-series so we can see the spike after we post on Instagram. 

- Bonus: don't count bots and scrapers. How would you even tell? 

## V. What We're Deliberately Not Telling You 

1. The gaps are intentional 

This PRD is under-specified on purpose. The gaps are the test. We left several decisions to you. We're not looking for a single right answer, we're looking for whether you notice the gap, make a call, and justify it. 

- Do links need accounts and logins, or is it open? Your call. 

- How do you model and store analytics events efficiently? Your call, defend it. 

- What does "unique click" mean? Define it; there's no official answer. 

- What happens to analytics when a link expires? You decide. 

A strong candidate writes their assumptions down. A weak one pretends the gaps don't exist. 

## VI. What You Submit 

1. A live, working link 

Deploy it. Send us a URL we can click. Vercel, Render, Railway, a VPS, wherever. If we can't reach it, we can't review it. Include the repo link too. 

Submit everything through this form: 

https://forms.gle/mjN9nMPhNQRr2Rqb8 

## 2. A README, written by you 

R E Q U I R E D 

This is where you win or lose. The README must be your own thinking, in your own words. Polished, generated prose is easy to spot and earns nothing. Honest, slightly messy human reasoning earns brownie points .Answer these: 

- What's your data model, and why did you design it that way? 

- If you only had 4 hours, what would you have built first, and what would you cut? 

- Name one tradeoff you made and what you gave up. 

- What did you assume because this PRD didn't tell you? 

## VII. How We Score 

1. The honest rubric 

We want working software, and we want to see the thinking behind it. A solid build that actually runs matters most, but how you reasoned through it is what separates close calls. The skills that matter most to us here: 

- Problem understanding: did you actually grasp what FLC 

- needs, or just pattern-match to "a link shortener"? 

- Reasoning and tradeoffs: can you justify your choices and name what you gave up? 

- Prioritization: did you build the right things first instead of everything? 

- Handling the hard parts: how you approached collisions, scheduling, and analytics. 

- Communication: can you explain your work clearly, in your own voice? 

Here's roughly how we weigh things. 

|WHAT WE LOOK AT|WEIGHT|
|---|---|
|Basic features work & deployed|30%|
|Core hard problems solved|30%|
|Reasoning & tradeoffs (README, more human = more|20%|
|brownie points)||
|Problem understanding & assumptions|12%|
|Communication & polish|8%|



Don't build everything. Build the right things well, and tell us why you chose them. 

## VIII. The Interview 

1. Be ready to talk us through it 

I M P O R TA N T 

We may call you for an interview at any point, and we'll give you at least 12 hours' notice before it. The interview is a conversation about your work, so come ready to walk us through it live. 

- If the project is still half-cooked when we call (deadline not yet reached), that's completely fine. 

- Be ready to demo the features that are done and explain how they work. 

- Be ready to talk through what's still left, how you plan to build it, and roughly when. 

- What we're really checking: do you understand your own project well enough to defend and continue it on the spot? 

## IX. One Last Thing 

1. If you're selected 

A quick heads-up so there are no surprises later. Everything built for Finite Loop Club lives under the club's GitHub organization, so we can maintain it together across batches as people graduate and new members join. 

- Build in your own repo for now; nothing to do up front. 

- If you're selected, we'll simply ask you to transfer the FLCut repo into the FLC GitHub organization. 



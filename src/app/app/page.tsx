"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Link2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  HelpCircle,
  Sliders,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  RefreshCw,
  Pencil,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../components/ThemeProvider";
import { Footer } from "../../components/Footer";

interface ShortLink {
  id: number;
  slug: string;
  longUrl: string;
  validFrom: string | null;
  validUntil: string | null;
  maxClicks: number | null;
  fallbackUrl: string | null;
  bypassAuth: boolean;
  createdAt: string;
  analyticsEvents?: Array<{
    id: number;
    isUnique: boolean;
    userAgent: string | null;
    country: string | null;
    city: string | null;
    clickedAt: string;
  }>;
}

function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: "Unknown", os: "Unknown" };
  let browser = "Other";
  let os = "Other";

  // Browser check
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg") && !ua.includes("OPR")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("MSIE") || ua.includes("Trident")) browser = "IE";

  // OS check
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

function getBreakdowns(events: Array<{ userAgent: string | null; country: string | null; city: string | null }> = []) {
  const browsers: { [key: string]: number } = {};
  const osList: { [key: string]: number } = {};
  const countries: { [key: string]: number } = {};
  const cities: { [key: string]: number } = {};

  events.forEach((e) => {
    const { browser, os } = parseUserAgent(e.userAgent);
    browsers[browser] = (browsers[browser] || 0) + 1;
    osList[os] = (osList[os] || 0) + 1;

    const ctry = e.country || "Unknown";
    countries[ctry] = (countries[ctry] || 0) + 1;

    const cty = e.city || "Unknown";
    cities[cty] = (cities[cty] || 0) + 1;
  });

  const sortDesc = (obj: { [key: string]: number }) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

  return {
    browsers: sortDesc(browsers),
    osList: sortDesc(osList),
    countries: sortDesc(countries),
    cities: sortDesc(cities),
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const user = session?.user;
  const isLoggedIn = status === "authenticated";

  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");

  // Advanced settings toggle & state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  const [requireAuth, setRequireAuth] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [successLink, setSuccessLink] = useState<ShortLink | null>(null);

  // Local links dashboard
  const [localSlugs, setLocalSlugs] = useState<string[]>([]);
  const [myLinks, setMyLinks] = useState<ShortLink[]>([]);
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [origin, setOrigin] = useState("");

  // Editing state
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [editLongUrl, setEditLongUrl] = useState("");
  const [editMaxClicks, setEditMaxClicks] = useState("");
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editRequireAuth, setEditRequireAuth] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Set origin and check URL parameters on mount
  useEffect(() => {
    setOrigin(window.location.origin);
    // Load local slugs
    const storedSlugs = localStorage.getItem("flcut_local_slugs");
    if (storedSlugs) {
      try {
        const parsed = JSON.parse(storedSlugs);
        if (Array.isArray(parsed)) {
          setLocalSlugs(parsed);
        }
      } catch {
        // Fallback for comma-separated legacy formats
        setLocalSlugs(storedSlugs.split(",").filter(Boolean));
      }
    }

    // Check URL parameters for redirect errors
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const slg = params.get("slug");
    if (err) {
      if (err === "link_not_active") {
        setError(`The link /${slg} is not active yet.`);
      } else if (err === "link_expired") {
        setError(`The link /${slg} has expired.`);
      } else if (err === "link_limit_reached") {
        setError(`The link /${slg} has reached its click limit.`);
      }
      // Clean up search parameters from the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch links details (either for logged-in user or anonymous slugs)
  useEffect(() => {
    if (!isLoggedIn && localSlugs.length === 0) {
      setMyLinks([]);
      return;
    }

    const fetchLinks = async () => {
      setIsFetchingLinks(true);
      try {
        const query = isLoggedIn ? "" : `?slugs=${localSlugs.join(",")}`;
        const res = await fetch(`/api/links${query}`, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setMyLinks(data);
        }
      } catch (err) {
        console.error("Failed to fetch links:", err);
      } finally {
        setIsFetchingLinks(false);
      }
    };

    fetchLinks();
  }, [localSlugs, isLoggedIn, refreshTrigger]);

  const startEditing = (link: ShortLink) => {
    setEditingLink(link);
    setEditLongUrl(link.longUrl);
    setEditMaxClicks(link.maxClicks !== null ? String(link.maxClicks) : "");

    // Format dates to datetime-local format (YYYY-MM-DDTHH:MM)
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    };

    setEditValidFrom(formatDate(link.validFrom));
    setEditValidUntil(formatDate(link.validUntil));
    setEditRequireAuth(!link.bypassAuth);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    setIsUpdating(true);
    setEditError(null);

    try {
      const payload: any = {
        slug: editingLink.slug,
        longUrl: editLongUrl.trim(),
        bypassAuth: !editRequireAuth,
      };

      payload.validFrom = editValidFrom ? new Date(editValidFrom).toISOString() : null;
      payload.validUntil = editValidUntil ? new Date(editValidUntil).toISOString() : null;
      payload.maxClicks = editMaxClicks !== undefined && editMaxClicks !== "" ? parseInt(editMaxClicks, 10) : null;

      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update link configurations.");
        return;
      }

      // Update link list locally
      setMyLinks((prev) =>
        prev.map((link) => (link.slug === editingLink.slug ? data : link))
      );

      // Close modal
      setEditingLink(null);
    } catch (err) {
      console.error(err);
      setEditError("Failed to connect to server. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSuccessLink(null);

    try {
      const payload: any = {
        longUrl,
        bypassAuth: !requireAuth,
      };

      if (customSlug.trim()) {
        payload.customSlug = customSlug.trim();
      }

      if (validFrom) payload.validFrom = new Date(validFrom).toISOString();
      if (validUntil) payload.validUntil = new Date(validUntil).toISOString();
      if (maxClicks) payload.maxClicks = parseInt(maxClicks, 10);

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error || "Slug already taken.");
          setSuggestions(data.suggestions || []);
        } else {
          setError(data.error || "Something went wrong.");
        }
        return;
      }

      // Success
      setSuccessLink(data);
      setLongUrl("");
      setCustomSlug("");
      setValidFrom("");
      setValidUntil("");
      setMaxClicks("");
      setRequireAuth(false);
      setShowAdvanced(false);

      // Save to local list if anonymous
      if (!isLoggedIn) {
        const updatedSlugs = [data.slug, ...localSlugs.filter((s) => s !== data.slug)];
        localStorage.setItem("flcut_local_slugs", JSON.stringify(updatedSlugs));
        setLocalSlugs(updatedSlugs);
      } else {
        // If logged in, reload link list from database directly
        setMyLinks((prev) => [data, ...prev]);
      }
    } catch (err) {
      setError("Failed to connect to server. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (slug: string) => {
    navigator.clipboard.writeText(`${origin}/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => {
      setCopiedSlug(null);
    }, 2000);
  };

  const handleDelete = async (slug: string) => {
    if (isLoggedIn) {
      try {
        const res = await fetch(`/api/links?slug=${slug}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setMyLinks(myLinks.filter((link) => link.slug !== slug));
        } else {
          const data = await res.json();
          alert(data.error || "Failed to delete link.");
        }
      } catch (err) {
        console.error("Delete failed:", err);
      }
    } else {
      const updatedSlugs = localSlugs.filter((s) => s !== slug);
      localStorage.setItem("flcut_local_slugs", JSON.stringify(updatedSlugs));
      setLocalSlugs(updatedSlugs);
    }
  };

  const isLinkActive = (link: ShortLink) => {
    const now = new Date();
    if (link.validFrom && now < new Date(link.validFrom)) return false;
    if (link.validUntil && now > new Date(link.validUntil)) return false;

    // Check click limit expiration
    const totalClicks = link.analyticsEvents?.length || 0;
    if (link.maxClicks !== null && totalClicks >= link.maxClicks) return false;

    return true;
  };

  return (
    <div className={`min-h-screen bg-transparent flex flex-col font-sans relative overflow-hidden transition-colors duration-500 ${isDark ? "text-neutral-100" : "text-neutral-900"
      }`}>
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full dark:bg-violet-900/10 light:bg-violet-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full dark:bg-cyan-900/10 light:bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Premium Glassmorphic Navbar with subtle accent line */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-500 shadow-md ${isDark
        ? "border-violet-900/10 bg-neutral-950/30 shadow-violet-950/5"
        : "border-violet-200/20 bg-white/30 shadow-violet-100/5"
        }`}>
        {/* Subtle Bottom Accent Glow Line */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 transition-transform group-hover:scale-105">
                <span className="font-black text-black text-lg">FL</span>
              </div>
              <div>
                <span className={`font-bold text-lg leading-tight tracking-tight block ${isDark ? "text-white" : "text-neutral-900"
                  }`}>
                  FLCut
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* About Navigation Link */}
            <Link
              href="/#about"
              className={`text-sm font-semibold transition-colors cursor-pointer ${isDark ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-black"
                }`}
            >
              About
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark
                ? "bg-neutral-900 border-neutral-800 text-yellow-400 hover:bg-neutral-800"
                : "bg-white border-neutral-200 text-violet-600 hover:bg-neutral-50 shadow-sm"
                }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Auth Action Button matching landing page premium styles */}
            {status === "loading" ? (
              <div className={`h-8 w-20 rounded-xl animate-pulse ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md select-none font-semibold text-xs transition-all ${isDark ? "bg-neutral-900/40 border-neutral-800 text-neutral-200" : "bg-white/40 border-neutral-250 text-neutral-700"}`}>
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="h-5 w-5 rounded-full border border-neutral-300 dark:border-neutral-750 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center font-bold text-[10px]">
                      {user?.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[120px] truncate">{user?.name || user?.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shadow-lg shadow-violet-600/20 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login?callbackUrl=/app"
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shadow-lg shadow-violet-600/20 cursor-pointer"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12 z-10">
        {/* Hero Area */}
        <div className="text-center flex flex-col gap-4">
          <h2 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-none ${isDark ? "text-white" : "text-neutral-900"
            }`}>
            Shorten Links with <span className={`story-script-regular text-violet-500 dark:text-violet-400 text-5xl sm:text-6xl md:text-7xl block sm:inline-block ml-1 font-normal tracking-wide drop-shadow-[0_2px_8px_rgba(139,92,246,0.2)]`}>Precision</span>
          </h2>
          <p className={`text-base max-w-xl mx-auto leading-relaxed ${isDark ? "text-neutral-400" : "text-neutral-600"
            }`}>
            Create fast, clean, and customizable short links instantly. Monitor your creations right in your {isLoggedIn ? "creator account" : "browser"} dashboard.
          </p>
        </div>

        {/* Shortener Core Card */}
        <div className={`rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative transition-all duration-300 ${isDark ? "bg-neutral-900/50 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
          }`}>
          <form onSubmit={handleShorten} className="flex flex-col gap-6">
            {/* Long URL Input */}
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"
                }`}>
                <Link2 className={`h-4 w-4 ${isDark ? "text-violet-400" : "text-violet-500"}`} />
                Destination URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://example.com/very-long-link-to-shorten"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className={`w-full border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm pr-12 ${isDark
                    ? "bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-500"
                    : "bg-neutral-50/80 border-neutral-300 text-neutral-900 placeholder-neutral-400"
                    }`}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  <Link2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Custom Slug Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"
                  }`}>
                  <Sparkles className={`h-4 w-4 ${isDark ? "text-cyan-400" : "text-cyan-500"}`} />
                  Custom Slug <span className={`font-normal text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>(optional)</span>
                </label>
              </div>
              <div className={`flex rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500 transition-all ${isDark ? "border-neutral-800 bg-neutral-950/80" : "border-neutral-300 bg-neutral-50/80"
                }`}>
                <span className={`px-4 flex items-center text-xs font-mono border-r select-none ${isDark ? "bg-neutral-900 text-neutral-400 border-neutral-800" : "bg-neutral-100 text-neutral-500 border-neutral-300"
                  }`}>
                  {origin ? origin.replace(/^https?:\/\//i, "") : "flcut.club"}/
                </span>
                <input
                  type="text"
                  placeholder="custom-slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className={`w-full bg-transparent py-3 px-4 focus:outline-none text-sm font-mono ${isDark ? "text-neutral-100 placeholder-neutral-600" : "text-neutral-900 placeholder-neutral-400"
                    }`}
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className={`border-t pt-4 ${isDark ? "border-neutral-800" : "border-neutral-200"}`}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-950"
                  }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Advanced Controls (Validity & Expiration)
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fadeIn">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      <Calendar className="h-3 w-3" /> Valid From
                    </label>
                    <input
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) { }
                      }}
                      className={`border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer w-full text-left ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300" : "bg-neutral-50 border-neutral-300 text-neutral-800"
                        }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      <Calendar className="h-3 w-3" /> Valid Until
                    </label>
                    <input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) { }
                      }}
                      className={`border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer w-full text-left ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300" : "bg-neutral-50 border-neutral-300 text-neutral-800"
                        }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      <Clock className="h-3 w-3" /> Max Clicks
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={maxClicks}
                      onChange={(e) => setMaxClicks(e.target.value)}
                      className={`border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 ${isDark
                        ? "bg-neutral-950/80 border-neutral-800 text-neutral-300 placeholder-neutral-600"
                        : "bg-neutral-50 border-neutral-300 text-neutral-800 placeholder-neutral-400"
                        }`}
                    />
                  </div>

                  {/* Visitor authentication toggle */}
                  <div className={`flex flex-col gap-1.5 md:col-span-2 border-t pt-4 mt-2 ${isDark ? "border-neutral-800/60" : "border-neutral-200"
                    }`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={requireAuth}
                          onChange={(e) => setRequireAuth(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${requireAuth ? 'bg-violet-600' : (isDark ? 'bg-neutral-800' : 'bg-neutral-200')}`}></div>
                        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${requireAuth ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-semibold ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>Require FLCut Login</span>
                        <span className="text-[10px] text-neutral-500">
                          Force visitors to sign in on FLCut first (ideal if the destination site has no built-in auth).
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message & Suggestions */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Available Suggestions (click to choose):</span>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setCustomSlug(sug);
                            setError(null);
                            setSuggestions([]);
                          }}
                          className="bg-neutral-100 dark:bg-neutral-950 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-xs font-mono py-1 px-3 rounded-lg text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all hover:opacity-95 disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.99] flex items-center justify-center gap-2 select-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Shortening...
                </>
              ) : (
                "Shorten Link"
              )}
            </button>
          </form>

          {/* Success Banner */}
          {successLink && (
            <div className="mt-6 bg-gradient-to-tr from-violet-50/50 to-cyan-50/50 dark:from-violet-950/30 dark:to-cyan-950/30 border border-violet-500/20 p-5 rounded-2xl animate-scaleIn flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold tracking-wider font-mono uppercase">
                  Successfully Shortened!
                </span>
                <a
                  href={`${origin}/${successLink.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-neutral-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1.5 transition-colors font-mono"
                >
                  {origin ? origin.replace(/^https?:\/\//i, "") : "flcut.club"}/{successLink.slug}
                  <ExternalLink className="h-4 w-4 opacity-65" />
                </a>
                <span className="text-xs text-neutral-500 dark:text-neutral-500 max-w-md truncate">
                  Original: {successLink.longUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(successLink.slug)}
                className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-850 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              >
                {copiedSlug === successLink.slug ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Local Dashboard */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-900 pb-4">
            <h3 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? "text-white" : "text-neutral-900"
              }`}>
              {isLoggedIn ? "Account Dashboard" : "My Links"}
              <span className={`border text-xs px-2 py-0.5 rounded-full font-mono font-normal ${isDark ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-500"
                }`}>
                {myLinks.length}
              </span>
            </h3>

            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={isFetchingLinks}
              className={`border p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-semibold select-none shadow-sm ${isDark
                ? "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                }`}
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingLinks ? "animate-spin text-cyan-500 dark:text-cyan-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {isFetchingLinks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`border rounded-2xl p-5 flex flex-col gap-4 animate-pulse ${isDark ? "bg-neutral-900/30 border-neutral-800/50" : "bg-white/40 border-neutral-200/50"
                    }`}
                >
                  <div className={`h-5 rounded w-1/2 ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
                  <div className={`h-4 rounded w-3/4 ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
                  <div className={`h-10 rounded-xl ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
                </div>
              ))}
            </div>
          ) : myLinks.length === 0 ? (
            <div className={`text-center py-16 border rounded-3xl flex flex-col items-center gap-3 ${isDark ? "bg-neutral-900/10 border-neutral-900" : "bg-neutral-50/30 border-neutral-200"
              }`}>
              <div className={`h-12 w-12 rounded-full border flex items-center justify-center ${isDark ? "bg-neutral-900 border-neutral-800 text-neutral-500" : "bg-neutral-100 border-neutral-200 text-neutral-400"
                }`}>
                <Link2 className="h-6 w-6" />
              </div>
              <h4 className={`font-semibold ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>No links shortened yet</h4>
              <p className="text-xs text-neutral-500 max-w-xs leading-normal">
                {isLoggedIn
                  ? "You haven't created any links under this account yet. Shorten a URL above to start!"
                  : "Your shortened links will appear here on this browser. Put a URL above to get started!"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myLinks.map((link) => {
                const active = isLinkActive(link);
                const totalClicks = link.analyticsEvents?.length || 0;
                const uniqueClicks = link.analyticsEvents?.filter((e) => e.isUnique).length || 0;

                return (
                  <div
                    key={link.id}
                    className={`border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between gap-4 group relative overflow-hidden ${isDark
                      ? "bg-neutral-900/35 border-neutral-800/80 hover:border-neutral-700/80"
                      : "bg-white/60 border-neutral-200/80 hover:border-neutral-305"
                      }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white max-w-[50%] truncate">
                          /{link.slug}
                        </span>
                        <div className="flex items-center gap-2">
                          {!link.bypassAuth && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                              Auth Req
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${active
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400"
                              }`}
                          >
                            {active ? "Active" : "Expired"}
                          </span>
                        </div>
                      </div>

                      {/* Click Telemetry Counters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-neutral-100/80 dark:bg-neutral-950/60 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800/80 text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          Clicks: <strong className="text-neutral-900 dark:text-white font-mono">{totalClicks}</strong>
                        </span>
                        <span className="text-[10px] bg-neutral-100/80 dark:bg-neutral-950/60 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800/80 text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          Unique: <strong className="text-neutral-900 dark:text-white font-mono">{uniqueClicks}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate" title={link.longUrl}>
                        {link.longUrl}
                      </p>
                      <span className="text-[10px] text-neutral-450 dark:text-neutral-500 font-mono">
                        Created: {new Date(link.createdAt).toLocaleDateString()}
                      </span>

                      {!active && (
                        <div className="text-[10px] text-red-600 dark:text-red-450 mt-2 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/20 rounded-lg p-2.5 flex items-center gap-1.5 font-mono select-none">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-600 dark:text-red-450 animate-pulse" />
                          <span className="leading-tight">
                            {(() => {
                              const now = new Date();
                              const isTimeExceeded = link.validUntil && now > new Date(link.validUntil);
                              const isCapHit = link.maxClicks !== null && totalClicks >= link.maxClicks;
                              if (isTimeExceeded && isCapHit) {
                                return `Expired: Time limit exceeded (ended ${new Date(link.validUntil!).toLocaleString()}) & click cap hit (${link.maxClicks} max).`;
                              }
                              if (isTimeExceeded) {
                                return `Expired: Time limit exceeded (ended ${new Date(link.validUntil!).toLocaleString()}).`;
                              }
                              if (isCapHit) {
                                return `Expired: Click limit cap hit (${link.maxClicks} max).`;
                              }
                              const isPending = link.validFrom && now < new Date(link.validFrom);
                              if (isPending) {
                                return `Pending: Validity starts on ${new Date(link.validFrom!).toLocaleString()}.`;
                              }
                              return "Inactive: Link is unavailable.";
                            })()}
                          </span>
                        </div>
                      )}

                    </div>

                    <div className="flex gap-2 border-t border-neutral-200 dark:border-neutral-800/60 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.slug)}
                        className="flex-1 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {copiedSlug === link.slug ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>

                      <a
                        href={`${origin}/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        title="Visit Link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      {/* Analytics Navigation Link */}
                      <Link
                        href={`/analytics/${link.slug}`}
                        className="bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-800 text-neutral-500 hover:text-violet-600 dark:hover:text-violet-400 py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        title="View Analytics"
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                      </Link>

                      {/* Edit Configurations Button */}
                      <button
                        type="button"
                        onClick={() => startEditing(link)}
                        className="bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        title="Edit Configurations"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(link.slug)}
                        className="bg-neutral-50 hover:bg-red-55 hover:border-red-200 hover:text-red-600 dark:bg-neutral-900 dark:hover:bg-red-950/30 dark:hover:border-red-900/50 dark:hover:text-red-400 border border-neutral-250 dark:border-neutral-800 text-neutral-400 dark:text-neutral-505 py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        title="Delete from Dashboard"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal Overlay */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 relative animate-scaleIn border ${isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
            }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? "border-neutral-800" : "border-neutral-200"
              }`}>
              <h4 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-neutral-900"
                }`}>
                <Pencil className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                Edit Configurations: <span className={`font-mono text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>/{editingLink.slug}</span>
              </h4>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              {/* Destination URL */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-semibold ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>Destination URL</label>
                <input
                  type="text"
                  value={editLongUrl}
                  onChange={(e) => setEditLongUrl(e.target.value)}
                  className={`border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                    }`}
                  required
                />
              </div>

              {/* Dynamic Pickers grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-semibold ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Valid From</label>
                  <input
                    type="datetime-local"
                    value={editValidFrom}
                    onChange={(e) => setEditValidFrom(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker(); } catch { }
                    }}
                    className={`border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer text-left w-full ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                      }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-semibold ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Valid Until</label>
                  <input
                    type="datetime-local"
                    value={editValidUntil}
                    onChange={(e) => setEditValidUntil(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker(); } catch { }
                    }}
                    className={`border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer text-left w-full ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                      }`}
                  />
                </div>
              </div>

              {/* Click Cap Limit */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-semibold ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Max Clicks (Cap Limit)</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={editMaxClicks}
                  onChange={(e) => setEditMaxClicks(e.target.value)}
                  className={`border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-305 placeholder-neutral-600" : "bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400"
                    }`}
                />
              </div>

              {/* Secure FLCut auth toggle */}
              <label className={`flex items-center gap-3 cursor-pointer select-none border-t pt-4 mt-2 ${isDark ? "border-neutral-800/60" : "border-neutral-200"
                }`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={editRequireAuth}
                    onChange={(e) => setEditRequireAuth(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${editRequireAuth ? 'bg-violet-600' : (isDark ? 'bg-neutral-800' : 'bg-neutral-200')}`}></div>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${editRequireAuth ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-semibold ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>Require FLCut Login</span>
                  <span className="text-[10px] text-neutral-550">
                    Force visitors to log in on FLCut.
                  </span>
                </div>
              </label>

              {/* Edit Error message */}
              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {editError}
                </div>
              )}

              {/* Form Buttons */}
              <div className={`flex gap-2 border-t pt-4 mt-2 ${isDark ? "border-neutral-800" : "border-neutral-200"}`}>
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className={`flex-1 border text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer ${isDark
                    ? "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-500 hover:text-neutral-900"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

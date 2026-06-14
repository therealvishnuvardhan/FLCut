"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Laptop,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Pencil,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../../components/ThemeProvider";
import { Footer } from "../../../components/Footer";

interface AnalyticsEvent {
  id: number;
  isUnique: boolean;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  clickedAt: string;
}

interface HourlyAggregate {
  id: number;
  timeBucket: string;
  clicks: number;
  uniqueClicks: number;
}

interface ShortLink {
  id: number;
  slug: string;
  longUrl: string;
  validFrom: string | null;
  validUntil: string | null;
  maxClicks: number | null;
  bypassAuth: boolean;
  createdAt: string;
  analyticsEvents?: AnalyticsEvent[];
  hourlyAggregates?: HourlyAggregate[];
}

function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Desktop" };
  let browser = "Other";
  let os = "Other";
  let device = "Desktop";

  // Device type check
  const uaLower = ua.toLowerCase();
  if (
    uaLower.includes("mobi") ||
    uaLower.includes("android") ||
    uaLower.includes("iphone") ||
    uaLower.includes("ipad") ||
    uaLower.includes("ipod")
  ) {
    device = "Mobile";
  } else if (uaLower.includes("tablet") || uaLower.includes("playbook")) {
    device = "Tablet";
  }

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

  return { browser, os, device };
}

function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return "🏳️";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🏳️";
  }
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { slug } = use(params);
  const [link, setLink] = useState<ShortLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editLongUrl, setEditLongUrl] = useState("");
  const [editMaxClicks, setEditMaxClicks] = useState("");
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editRequireAuth, setEditRequireAuth] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchAnalytics = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analytics/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Shortened link not found.");
        } else if (res.status === 403) {
          throw new Error("Access denied. You do not own this link.");
        } else {
          throw new Error("Failed to load analytics statistics.");
        }
      }
      const data = await res.json();
      setLink(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchAnalytics();
  }, [slug]);

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(`${origin}/${link.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditing = () => {
    if (!link) return;
    setEditLongUrl(link.longUrl);
    setEditMaxClicks(link.maxClicks !== null ? String(link.maxClicks) : "");

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
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    setIsUpdating(true);
    setEditError(null);

    try {
      const payload: any = {
        slug: link.slug,
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

      setLink(data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setEditError("Failed to connect to server. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Compile stats
  const events = link?.analyticsEvents || [];
  const totalClicks = events.length;
  const uniqueClicks = events.filter((e) => e.isUnique).length;
  const conversionRate = totalClicks > 0 ? Math.round((uniqueClicks / totalClicks) * 100) : 0;

  // Aggregate metrics
  const browsers: Record<string, number> = {};
  const osList: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const cities: Record<string, number> = {};

  events.forEach((e) => {
    const { browser, os, device } = parseUserAgent(e.userAgent);
    browsers[browser] = (browsers[browser] || 0) + 1;
    osList[os] = (osList[os] || 0) + 1;
    devices[device] = (devices[device] || 0) + 1;

    const ctry = e.country || "Unknown";
    countries[ctry] = (countries[ctry] || 0) + 1;

    const cty = e.city || "Unknown";
    cities[cty] = (cities[cty] || 0) + 1;
  });

  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0 }));

  const topBrowsers = sortDesc(browsers);
  const topOS = sortDesc(osList);
  const topDevices = sortDesc(devices);
  const topCountries = sortDesc(countries);
  const topCities = sortDesc(cities);

  // Check link validity active status
  const isLinkActive = () => {
    if (!link) return false;
    const now = new Date();
    if (link.validFrom && now < new Date(link.validFrom)) return false;
    if (link.validUntil && now > new Date(link.validUntil)) return false;
    const totalClicks = link.analyticsEvents?.length || 0;
    if (link.maxClicks !== null && totalClicks >= link.maxClicks) return false;
    return true;
  };

  // SVG Chart: Click Activity Grouped by Day (7-day intervals starting from link creation)
  const getDailyClickChartData = () => {
    if (!link) return { data: [], maxCount: 5 };

    // Normalize link creation date to midnight local time
    const createdDate = new Date(link.createdAt);
    const startDate = new Date(
      createdDate.getFullYear(),
      createdDate.getMonth(),
      createdDate.getDate()
    );

    // Normalize today to midnight local time
    const currentDate = new Date();
    const today = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    // Calculate days passed since creation
    const diffTime = Math.max(0, today.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Determine the week block offset (shifts by 7 days once crossed)
    const weekBlock = Math.floor(diffDays / 7);

    // Generate the 7 days for the current week block
    const daysToShow = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (weekBlock * 7) + i);
      return d.toISOString().split("T")[0];
    });

    const dailyCounts = daysToShow.reduce((acc, dateStr) => {
      acc[dateStr] = 0;
      return acc;
    }, {} as Record<string, number>);

    events.forEach((e) => {
      const clickDate = e.clickedAt.split("T")[0];
      if (clickDate in dailyCounts) {
        dailyCounts[clickDate]++;
      }
    });

    const data = daysToShow.map((dateStr) => {
      const dateObj = new Date(dateStr);
      const label = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { label, count: dailyCounts[dateStr] };
    });

    const maxCount = Math.max(...data.map((d) => d.count), 5); // Fallback to 5 to keep scaling sensible
    return { data, maxCount };
  };

  const { data: chartData, maxCount } = getDailyClickChartData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center font-sans">
        <div className="relative h-12 w-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-cyan-400 animate-spin"></div>
        </div>
        <p className="text-neutral-400 text-xs font-mono mt-4">Analyzing click telemetries...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-md w-full text-center flex flex-col gap-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Analytics Unreachable</h2>
          <p className="text-neutral-400 text-sm">{error || "Something went wrong."}</p>
          <Link
            href="/"
            className="mt-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const active = isLinkActive();

  return (
    <div className={`min-h-screen bg-transparent flex flex-col font-sans relative overflow-hidden pb-12 transition-colors duration-500 ${isDark ? "text-neutral-100" : "text-neutral-900"
      }`}>
      {/* Glow decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full dark:bg-violet-900/10 light:bg-violet-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full dark:bg-cyan-900/10 light:bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Premium Glassmorphic Navbar with subtle accent line */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-500 shadow-md ${isDark
          ? "border-violet-900/20 bg-neutral-950/70 shadow-violet-950/5"
          : "border-violet-200/40 bg-white/70 shadow-violet-100/5"
        }`}>
        {/* Subtle Bottom Accent Glow Line */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`border p-2 rounded-xl transition-all cursor-pointer shadow-sm ${isDark ? "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white" : "bg-neutral-50 border-neutral-250 text-neutral-500 hover:text-neutral-900"
                }`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className={`font-bold text-base sm:text-lg flex items-center gap-2 ${isDark ? "text-white" : "text-neutral-900"
                }`}>
                FLCut Console
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
                <span className="font-mono text-violet-500 dark:text-violet-400 text-sm">/{link.slug}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={startEditing}
              className={`border py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer select-none shadow-sm font-semibold ${isDark ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-805" : "bg-neutral-50 border-neutral-250 text-neutral-700 hover:bg-neutral-100"
                }`}
            >
              <Pencil className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
              <span>Edit Link</span>
            </button>

            <button
              onClick={() => fetchAnalytics(true)}
              disabled={isRefreshing}
              className={`border py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-sm font-semibold ${isDark ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-805" : "bg-neutral-50 border-neutral-250 text-neutral-700 hover:bg-neutral-100"
                }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-500 dark:text-cyan-400" : ""}`} />
              {isRefreshing ? "Syncing..." : "Sync Clicks"}
            </button>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 z-10">
        {/* Link Identity Card */}
        <div className={`border rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 ${isDark ? "bg-neutral-900/50 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
          }`}>
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-2xl font-black font-mono tracking-tight truncate ${isDark ? "text-white" : "text-neutral-900"
                }`}>
                /{link.slug}
              </span>
              <div className="flex items-center gap-2">
                {!link.bypassAuth && (
                  <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                    Auth Required
                  </span>
                )}
                <span
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${active
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400"
                    }`}
                >
                  {active ? "Active" : "Expired"}
                </span>
              </div>
            </div>

            <a
              href={link.longUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1.5 truncate max-w-xl"
            >
              {link.longUrl}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>

            <span className="text-[10px] text-neutral-500 font-mono mt-1">
              Created on: {new Date(link.createdAt).toLocaleString()}
            </span>

            {!active && (
              <div className="text-[10px] text-red-650 dark:text-red-450 mt-3 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/30 rounded-xl p-3 flex items-center gap-2 font-mono select-none">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400 animate-pulse" />
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

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 md:flex-initial bg-neutral-950 hover:bg-neutral-850 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-650 dark:text-emerald-600" />
                  Copied URL!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Short Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`border rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm ${isDark ? "bg-neutral-900/35 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
            }`}>
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Total Clicks</span>
            <span className={`text-3xl font-black font-mono leading-none ${isDark ? "text-white" : "text-neutral-900"}`}>{totalClicks}</span>
            <span className="text-[10px] text-neutral-500 mt-1">Sum of all clicks hit</span>
          </div>

          <div className={`border rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm ${isDark ? "bg-neutral-900/35 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
            }`}>
            <span className="text-neutral-550 text-xs font-semibold uppercase tracking-wider">Unique Clicks</span>
            <span className={`text-3xl font-black font-mono leading-none ${isDark ? "text-cyan-450" : "text-cyan-600"}`}>{uniqueClicks}</span>
            <span className="text-[10px] text-neutral-500 mt-1">Clicks from unique tab sessions</span>
          </div>

          <div className={`border rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm ${isDark ? "bg-neutral-900/35 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
            }`}>
            <span className="text-neutral-550 text-xs font-semibold uppercase tracking-wider">Unique Ratio</span>
            <span className={`text-3xl font-black font-mono leading-none ${isDark ? "text-violet-400" : "text-violet-600"}`}>{conversionRate}%</span>
            <span className="text-[10px] text-neutral-500 mt-1">Unique visitor conversion share</span>
          </div>

          <div className={`border rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm ${isDark ? "bg-neutral-900/35 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
            }`}>
            <span className="text-neutral-550 text-xs font-semibold uppercase tracking-wider">Status & Cap</span>
            <span className={`text-lg font-bold flex items-center gap-1.5 py-1 ${isDark ? "text-white" : "text-neutral-900"}`}>
              {link.maxClicks ? (
                <>
                  <strong className={isDark ? "text-neutral-200" : "text-neutral-850"}>{totalClicks}</strong>
                  <span className="text-neutral-400">/</span>
                  <span className="text-neutral-500 font-mono text-sm">{link.maxClicks} max</span>
                </>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm uppercase tracking-wide">Unlimited</span>
              )}
            </span>
            <span className="text-[10px] text-neutral-500">Visitor capping constraint</span>
          </div>
        </div>

        {/* Charts & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SVG Click Trend Chart */}
          <div className={`border rounded-2xl p-6 lg:col-span-2 flex flex-col gap-4 shadow-sm ${isDark ? "bg-neutral-900/35 border-neutral-800/80" : "bg-white/60 border-neutral-200/80"
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-neutral-800" : "border-neutral-200"
              }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? "text-white" : "text-neutral-900"}`}>
                <TrendingUp className={`h-4 w-4 ${isDark ? "text-violet-400" : "text-violet-500"}`} />
                Click Activity (Current 7-Day Window)
              </h3>
            </div>

            {totalClicks === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-neutral-500 dark:text-neutral-600 italic">
                No telemetry recorded for this link.
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-fadeIn">
                {/* SVG Graph rendering */}
                <div className="w-full h-48 bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-850/60 rounded-xl p-4 flex items-end justify-between gap-2 relative">
                  {chartData.map((d, i) => {
                    const barHeight = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-850 text-[10px] font-mono font-bold text-neutral-900 dark:text-white py-1 px-2 rounded-md absolute translate-y-[-140%] pointer-events-none shadow-xl">
                          Clicks: {d.count}
                        </div>
                        {/* Interactive Bar */}
                        <div
                          style={{ height: `${barHeight}%` }}
                          className="w-full min-h-[4px] rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-500 dark:from-violet-600 dark:to-cyan-400 hover:from-violet-500 hover:to-cyan-300 transition-all shadow-md hover:shadow-cyan-500/25"
                        />
                        {/* X-axis Label */}
                        <span className="text-[9px] text-neutral-550 dark:text-neutral-500 truncate max-w-full font-mono mt-1">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Device Breakdown Box */}
          <div className="bg-white/60 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              Device Distribution
            </h3>
            {totalClicks === 0 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-600 italic py-12 text-center">
                No device data.
              </div>
            ) : (
              <div className="flex flex-col gap-4 justify-center h-full">
                {topDevices.map((dev) => (
                  <div key={dev.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        {dev.name === "Mobile" ? (
                          <Smartphone className="h-3.5 w-3.5 text-neutral-450 dark:text-neutral-500" />
                        ) : dev.name === "Tablet" ? (
                          <Laptop className="h-3.5 w-3.5 text-neutral-450 dark:text-neutral-500" />
                        ) : (
                          <Laptop className="h-3.5 w-3.5 text-neutral-450 dark:text-neutral-500" />
                        )}
                        {dev.name}
                      </span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">
                        {dev.count} ({dev.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-200 dark:border-neutral-900">
                      <div
                        style={{ width: `${dev.percentage}%` }}
                        className="bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-600 dark:to-cyan-400 h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top Browsers */}
          <div className="bg-white/60 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm border-b border-neutral-200 dark:border-neutral-850 pb-3">Browsers</h3>
            {topBrowsers.length === 0 ? (
              <div className="text-neutral-500 dark:text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topBrowsers.map((b) => (
                  <div key={b.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-neutral-700 dark:text-neutral-300 font-semibold">
                      <span>{b.name}</span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">{b.count} clicks</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div style={{ width: `${b.percentage}%` }} className="bg-cyan-500 h-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top OS */}
          <div className="bg-white/60 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm border-b border-neutral-200 dark:border-neutral-850 pb-3">Operating Systems</h3>
            {topOS.length === 0 ? (
              <div className="text-neutral-500 dark:text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topOS.map((o) => (
                  <div key={o.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-neutral-700 dark:text-neutral-300 font-semibold">
                      <span>{o.name}</span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">{o.count} clicks</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div style={{ width: `${o.percentage}%` }} className="bg-violet-500 h-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Geolocation Countries & Cities */}
          <div className="bg-white/60 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm border-b border-neutral-200 dark:border-neutral-850 pb-3 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-violet-500 dark:text-violet-400" /> Geolocation
            </h3>
            {topCountries.length === 0 ? (
              <div className="text-neutral-500 dark:text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[170px] overflow-y-auto pr-1">
                {/* Countries list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">Top Countries</span>
                  {topCountries.slice(0, 3).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs text-neutral-750 dark:text-neutral-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm select-none">{getCountryFlag(c.name === "Unknown" ? null : c.name)}</span>
                        {c.name}
                      </span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">{c.count} hits</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 dark:border-neutral-850/60" />

                {/* Cities list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider">Top Cities</span>
                  {topCities.slice(0, 3).map((city) => (
                    <div key={city.name} className="flex items-center justify-between text-xs text-neutral-750 dark:text-neutral-300 font-semibold">
                      <span className="truncate max-w-[150px]">{city.name}</span>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">{city.count} hits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Visitors Audit Log Panel */}
        <div className="bg-white/60 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm border-b border-neutral-200 dark:border-neutral-850 pb-3">
            Detailed Visitors Audit Log (Last 20 hits)
          </h3>
          {events.length === 0 ? (
            <div className="text-neutral-500 dark:text-neutral-600 italic py-12 text-center text-xs">No visitors telemetry found yet</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs text-neutral-700 dark:text-neutral-300 min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-850 text-neutral-500">
                    <th className="py-2.5 px-3">Clicked At</th>
                    <th className="py-2.5 px-3">Unique</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Device / Browser</th>
                    <th className="py-2.5 px-3">OS</th>
                    <th className="py-2.5 px-3 max-w-[200px] truncate">User-Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-850/40">
                  {events.slice(0, 20).map((e) => {
                    const { browser, os, device } = parseUserAgent(e.userAgent);
                    return (
                      <tr key={e.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-neutral-500 dark:text-neutral-400">
                          {new Date(e.clickedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {e.isUnique ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded text-[8px] uppercase font-mono">
                              Unique
                            </span>
                          ) : (
                            <span className="bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 text-neutral-500 px-2 py-0.5 rounded text-[8px] uppercase font-mono">
                              Repeat
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-850 dark:text-neutral-200">
                          <span className="flex items-center gap-1">
                            <span className="select-none">{getCountryFlag(e.country)}</span>
                            {[e.city, e.country].filter(Boolean).join(", ") || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-800 dark:text-neutral-200">
                          {device} ({browser})
                        </td>
                        <td className="py-3 px-3 font-mono">{os}</td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-neutral-450 dark:text-neutral-500 font-mono text-[10px]" title={e.userAgent || ""}>
                          {e.userAgent || "Unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6 relative animate-scaleIn border ${isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
            }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? "border-neutral-800" : "border-neutral-200"
              }`}>
              <h4 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-neutral-900"}`}>
                <Pencil className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                Edit Configurations: <span className={`font-mono text-xs ${isDark ? "text-neutral-450" : "text-neutral-500"}`}>/{link.slug}</span>
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
                  className={`border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 ${isDark ? "bg-neutral-950/80 border-neutral-800 text-neutral-300 placeholder-neutral-600" : "bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400"
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
                  <span className="text-[10px] text-neutral-500">
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
                  onClick={() => setIsEditing(false)}
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

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
} from "lucide-react";

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
  const { slug } = use(params);
  const [link, setLink] = useState<ShortLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-hidden pb-12">
      {/* Glow decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-2 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                FLCut Console
                <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
                <span className="font-mono text-violet-400 text-sm">/{link.slug}</span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync Clicks"}
          </button>
        </div>
      </header>

      {/* Content Body */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 z-10">
        {/* Link Identity Card */}
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-black text-white font-mono tracking-tight truncate">
                /{link.slug}
              </span>
              <div className="flex items-center gap-2">
                {!link.bypassAuth && (
                  <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    Auth Required
                  </span>
                )}
                <span
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                    active
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
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
              className="text-xs text-neutral-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 truncate max-w-xl"
            >
              {link.longUrl}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>

            <span className="text-[10px] text-neutral-500 font-mono mt-1">
              Created on: {new Date(link.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 md:flex-initial bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
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
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-1.5">
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Total Clicks</span>
            <span className="text-3xl font-black text-white font-mono leading-none">{totalClicks}</span>
            <span className="text-[10px] text-neutral-400 mt-1">Sum of all clicks hit</span>
          </div>

          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-1.5">
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Unique Clicks</span>
            <span className="text-3xl font-black text-cyan-400 font-mono leading-none">{uniqueClicks}</span>
            <span className="text-[10px] text-neutral-400 mt-1">Clicks from unique tab sessions</span>
          </div>

          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-1.5">
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Unique Ratio</span>
            <span className="text-3xl font-black text-violet-400 font-mono leading-none">{conversionRate}%</span>
            <span className="text-[10px] text-neutral-400 mt-1">Unique visitor conversion share</span>
          </div>

          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-1.5">
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Status & Cap</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5 py-1">
              {link.maxClicks ? (
                <>
                  <strong className="text-neutral-200">{totalClicks}</strong>
                  <span className="text-neutral-600">/</span>
                  <span className="text-neutral-400 font-mono text-sm">{link.maxClicks} max</span>
                </>
              ) : (
                <span className="text-emerald-400 font-mono text-sm uppercase tracking-wide">Unlimited</span>
              )}
            </span>
            <span className="text-[10px] text-neutral-400">Visitor capping constraint</span>
          </div>
        </div>

        {/* Charts & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SVG Click Trend Chart */}
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                Click Activity (Current 7-Day Window)
              </h3>
            </div>
            
            {totalClicks === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-neutral-600 italic">
                No telemetry recorded for this link.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* SVG Graph rendering */}
                <div className="w-full h-48 bg-neutral-950/40 border border-neutral-850/60 rounded-xl p-4 flex items-end justify-between gap-2">
                  {chartData.map((d, i) => {
                    const barHeight = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold text-white py-1 px-2 rounded-md absolute translate-y-[-140%] pointer-events-none shadow-xl">
                          Clicks: {d.count}
                        </div>
                        {/* Interactive Bar */}
                        <div 
                          style={{ height: `${barHeight}%` }} 
                          className="w-full min-h-[4px] rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400 group-hover:from-violet-500 group-hover:to-cyan-300 transition-all shadow-md group-hover:shadow-cyan-500/25"
                        />
                        {/* X-axis Label */}
                        <span className="text-[9px] text-neutral-500 truncate max-w-full font-mono mt-1">
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
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm border-b border-neutral-850 pb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-cyan-400" />
              Device Distribution
            </h3>
            {totalClicks === 0 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-600 italic py-12 text-center">
                No device data.
              </div>
            ) : (
              <div className="flex flex-col gap-4 justify-center h-full">
                {topDevices.map((dev) => (
                  <div key={dev.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        {dev.name === "Mobile" ? (
                          <Smartphone className="h-3.5 w-3.5 text-neutral-500" />
                        ) : dev.name === "Tablet" ? (
                          <Laptop className="h-3.5 w-3.5 text-neutral-500" />
                        ) : (
                          <Laptop className="h-3.5 w-3.5 text-neutral-500" />
                        )}
                        {dev.name}
                      </span>
                      <span className="font-mono text-neutral-400">
                        {dev.count} ({dev.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-900">
                      <div
                        style={{ width: `${dev.percentage}%` }}
                        className="bg-gradient-to-r from-violet-600 to-cyan-400 h-full rounded-full"
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
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm border-b border-neutral-850 pb-3">Browsers</h3>
            {topBrowsers.length === 0 ? (
              <div className="text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topBrowsers.map((b) => (
                  <div key={b.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-neutral-300 font-semibold">
                      <span>{b.name}</span>
                      <span className="font-mono text-neutral-500">{b.count} clicks</span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div style={{ width: `${b.percentage}%` }} className="bg-cyan-500 h-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top OS */}
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm border-b border-neutral-850 pb-3">Operating Systems</h3>
            {topOS.length === 0 ? (
              <div className="text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topOS.map((o) => (
                  <div key={o.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-neutral-300 font-semibold">
                      <span>{o.name}</span>
                      <span className="font-mono text-neutral-500">{o.count} clicks</span>
                    </div>
                    <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                      <div style={{ width: `${o.percentage}%` }} className="bg-violet-500 h-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Geolocation Countries & Cities */}
          <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm border-b border-neutral-850 pb-3 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-violet-400" /> Geolocation
            </h3>
            {topCountries.length === 0 ? (
              <div className="text-neutral-600 italic py-6 text-center text-xs">No records available</div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[170px] overflow-y-auto pr-1">
                {/* Countries list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Top Countries</span>
                  {topCountries.slice(0, 3).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm select-none">{getCountryFlag(c.name === "Unknown" ? null : c.name)}</span>
                        {c.name}
                      </span>
                      <span className="font-mono text-neutral-500">{c.count} hits</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-850/60" />

                {/* Cities list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Top Cities</span>
                  {topCities.slice(0, 3).map((city) => (
                    <div key={city.name} className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
                      <span className="truncate max-w-[150px]">{city.name}</span>
                      <span className="font-mono text-neutral-500">{city.count} hits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Logs Panel */}
        <div className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-bold text-white text-sm border-b border-neutral-850 pb-3">
            Detailed Visitors Audit Log (Last 20 hits)
          </h3>
          {events.length === 0 ? (
            <div className="text-neutral-600 italic py-12 text-center text-xs">No visitors telemetry found yet</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs text-neutral-300 min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-850 text-neutral-500">
                    <th className="py-2.5 px-3">Clicked At</th>
                    <th className="py-2.5 px-3">Unique</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Device / Browser</th>
                    <th className="py-2.5 px-3">OS</th>
                    <th className="py-2.5 px-3 max-w-[200px] truncate">User-Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850/40">
                  {events.slice(0, 20).map((e) => {
                    const { browser, os, device } = parseUserAgent(e.userAgent);
                    return (
                      <tr key={e.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-neutral-400">
                          {new Date(e.clickedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {e.isUnique ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[8px] uppercase font-mono">
                              Unique
                            </span>
                          ) : (
                            <span className="bg-neutral-950/60 border border-neutral-800 text-neutral-500 px-2 py-0.5 rounded text-[8px] uppercase font-mono">
                              Repeat
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className="flex items-center gap-1">
                            <span className="select-none">{getCountryFlag(e.country)}</span>
                            {[e.city, e.country].filter(Boolean).join(", ") || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-200">
                          {device} ({browser})
                        </td>
                        <td className="py-3 px-3 font-mono">{os}</td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-neutral-500 font-mono text-[10px]" title={e.userAgent || ""}>
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
    </div>
  );
}

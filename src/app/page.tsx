"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface ShortLink {
  id: number;
  slug: string;
  longUrl: string;
  validFrom: string | null;
  validUntil: string | null;
  maxClicks: number | null;
  fallbackUrl: string | null;
  createdAt: string;
}

export default function Home() {
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  
  // Advanced settings toggle & state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [successLink, setSuccessLink] = useState<ShortLink | null>(null);
  
  // Local links dashboard
  const [localSlugs, setLocalSlugs] = useState<string[]>([]);
  const [myLinks, setMyLinks] = useState<ShortLink[]>([]);
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  // Set origin on mount
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
  }, []);

  // Fetch local links details
  useEffect(() => {
    if (localSlugs.length === 0) {
      setMyLinks([]);
      return;
    }

    const fetchLinks = async () => {
      setIsFetchingLinks(true);
      try {
        const res = await fetch(`/api/links?slugs=${localSlugs.join(",")}`);
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
  }, [localSlugs]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSuccessLink(null);

    try {
      const payload: any = {
        longUrl,
      };

      if (customSlug.trim()) {
        payload.customSlug = customSlug.trim();
      }

      // Add advanced parameters if they are filled (available in route.ts in future phases, but we write them here to prepare)
      if (validFrom) payload.validFrom = new Date(validFrom).toISOString();
      if (validUntil) payload.validUntil = new Date(validUntil).toISOString();
      if (maxClicks) payload.maxClicks = parseInt(maxClicks, 10);
      if (fallbackUrl) payload.fallbackUrl = fallbackUrl.trim();

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
      setFallbackUrl("");
      setShowAdvanced(false);

      // Save to localStorage
      const updatedSlugs = [data.slug, ...localSlugs.filter((s) => s !== data.slug)];
      localStorage.setItem("flcut_local_slugs", JSON.stringify(updatedSlugs));
      setLocalSlugs(updatedSlugs);
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

  const handleDelete = (slug: string) => {
    const updatedSlugs = localSlugs.filter((s) => s !== slug);
    localStorage.setItem("flcut_local_slugs", JSON.stringify(updatedSlugs));
    setLocalSlugs(updatedSlugs);
  };

  const isLinkActive = (link: ShortLink) => {
    const now = new Date();
    if (link.validFrom && now < new Date(link.validFrom)) return false;
    if (link.validUntil && now > new Date(link.validUntil)) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="font-black text-black text-lg">FL</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
                FLCut
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono tracking-wider">
                FINITE LOOP CLUB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v1.0 Local Only
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12 z-10">
        {/* Hero Area */}
        <div className="text-center flex flex-col gap-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-50 via-white to-neutral-400">
            Shorten Links with Precision.
          </h2>
          <p className="text-neutral-400 text-base max-w-xl mx-auto leading-relaxed">
            Create fast, clean, and customizable short links instantly. Monitor your creations right in your browser dashboard.
          </p>
        </div>

        {/* Shortener Core Card */}
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative">
          <form onSubmit={handleShorten} className="flex flex-col gap-6">
            {/* Long URL Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-violet-400" />
                Destination URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://example.com/very-long-link-to-shorten"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-3 px-4 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm pr-12"
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
                <label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Custom Slug <span className="text-neutral-500 font-normal text-xs">(optional)</span>
                </label>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-neutral-800 focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500 transition-all bg-neutral-950/80">
                <span className="bg-neutral-900 px-4 flex items-center text-xs font-mono text-neutral-500 border-r border-neutral-800 select-none">
                  {origin ? origin.replace(/^https?:\/\//i, "") : "flcut.club"}/
                </span>
                <input
                  type="text"
                  placeholder="custom-slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className="w-full bg-transparent py-3 px-4 text-neutral-100 placeholder-neutral-600 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
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
                    <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Valid From
                    </label>
                    <input
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Valid Until
                    </label>
                    <input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Max Clicks
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={maxClicks}
                      onChange={(e) => setMaxClicks(e.target.value)}
                      className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                      <HelpCircle className="h-3 w-3" /> Fallback URL
                    </label>
                    <input
                      type="text"
                      placeholder="Waitlist / Expired fallback page"
                      value={fallbackUrl}
                      onChange={(e) => setFallbackUrl(e.target.value)}
                      className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Message & Suggestions */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-neutral-400">Available Suggestions (click to choose):</span>
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
                          className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono py-1 px-3 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
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
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all hover:opacity-95 disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.99] flex items-center justify-center gap-2 select-none"
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
            <div className="mt-6 bg-gradient-to-tr from-violet-950/30 to-cyan-950/30 border border-violet-500/20 p-5 rounded-2xl animate-scaleIn flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-violet-400 font-bold tracking-wider font-mono uppercase">
                  Successfully Shortened!
                </span>
                <a
                  href={`${origin}/${successLink.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-white hover:text-cyan-400 flex items-center gap-1.5 transition-colors font-mono"
                >
                  {origin ? origin.replace(/^https?:\/\//i, "") : "flcut.club"}/{successLink.slug}
                  <ExternalLink className="h-4 w-4 opacity-65" />
                </a>
                <span className="text-xs text-neutral-500 max-w-md truncate">
                  Original: {successLink.longUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(successLink.slug)}
                className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95"
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
          <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              My Links
              <span className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 px-2 py-0.5 rounded-full font-mono font-normal">
                {myLinks.length}
              </span>
            </h3>
          </div>

          {isFetchingLinks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-5 flex flex-col gap-4 animate-pulse"
                >
                  <div className="h-5 bg-neutral-800 rounded w-1/2" />
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-10 bg-neutral-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : myLinks.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/10 border border-neutral-900 rounded-3xl flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500">
                <Link2 className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-neutral-300">No links shortened yet</h4>
              <p className="text-xs text-neutral-500 max-w-xs leading-normal">
                Your shortened links will appear here on this browser. Put a URL above to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myLinks.map((link) => {
                const active = isLinkActive(link);
                return (
                  <div
                    key={link.id}
                    className="bg-neutral-900/35 border border-neutral-800/80 rounded-2xl p-5 hover:border-neutral-700/80 transition-all flex flex-col justify-between gap-4 group relative overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-white max-w-[70%] truncate">
                          /{link.slug}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                            active
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          }`}
                        >
                          {active ? "Active" : "Expired"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate" title={link.longUrl}>
                        {link.longUrl}
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Created: {new Date(link.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2 border-t border-neutral-800/60 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.slug)}
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedSlug === link.slug ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
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
                        className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center"
                        title="Visit Link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDelete(link.slug)}
                        className="bg-neutral-900 hover:bg-red-950/30 hover:border-red-900/50 hover:text-red-400 border border-neutral-800 text-neutral-500 py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center"
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
      <footer className="border-t border-neutral-900 py-6 bg-neutral-950/20 text-center text-xs text-neutral-500 z-10">
        <p>&copy; {new Date().getFullYear()} Finite Loop Club. All rights reserved.</p>
      </footer>
    </div>
  );
}

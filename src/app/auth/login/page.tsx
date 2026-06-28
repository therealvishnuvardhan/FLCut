"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTheme } from "../../../components/ThemeProvider";
import { Footer } from "../../../components/Footer";

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleLogin = () => {
    setLoading(true);
    signIn("google", { callbackUrl }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-black font-bold py-3.5 px-6 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 select-none cursor-pointer"
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      ) : (
        <>
          Sign in with Google
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen bg-transparent flex flex-col font-sans relative overflow-hidden items-center justify-between transition-colors duration-500 ${
      isDark ? "text-neutral-100" : "text-neutral-900"
    }`}>
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full dark:bg-violet-900/10 light:bg-violet-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full dark:bg-cyan-900/10 light:bg-cyan-500/5 blur-[150px] pointer-events-none" />

      {/* Spacer to push card down */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md px-4 py-16">
        <div className={`relative w-full border rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-8 text-center transition-all duration-300 ${
          isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-white/60 border-neutral-200"
        }`}>
          {/* Brand/Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="font-black text-black text-2xl">LC</span>
            </div>
            <div>
              <h1 className={`font-bold text-2xl tracking-tight ${isDark ? "text-white" : "text-neutral-900"}`}>LinkChop</h1>
              <p className={`text-xs font-mono tracking-widest mt-1 ${isDark ? "text-neutral-450" : "text-neutral-500"}`}>COLLEGE PLATFORM</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <h2 className={`text-xl font-semibold ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>Welcome to LinkChop</h2>
            <p className={`text-sm leading-relaxed ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
              Create branded links, manage advanced validity scheduler ranges, and track analytics. Login with your Google account to unlock creator dashboard features.
            </p>
          </div>

          {/* Buttons */}
          <Suspense fallback={
            <button disabled className="w-full bg-neutral-900/55 dark:bg-white/50 text-neutral-400 dark:text-black/50 font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 select-none cursor-not-allowed">
              Loading Google Sign-in...
            </button>
          }>
            <LoginForm />
          </Suspense>

          <p className="text-[10px] text-neutral-500 font-mono">
            Authorized club admin logins only.
          </p>
        </div>
      </div>

      {/* Reusable Footer throughout the website */}
      <Footer />
    </div>
  );
}

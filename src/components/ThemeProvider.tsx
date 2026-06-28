"use client";

import React, { createContext, useContext, useState, useEffect } from "react";


type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("linkchop-theme") as Theme;
    if (stored) {
      setTheme(stored);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(systemPrefersDark ? "dark" : "light");
    }
    setMounted(true);
  }, []);

  // Sync classes on theme change
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.setItem("linkchop-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Global Background Stack - Premium Static Grid Overlays */}
      {mounted && (
        <div className="fixed inset-0 -z-50 h-full w-full overflow-hidden pointer-events-none">
          {/* Light Theme Background */}
          <div className={`absolute inset-0 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1.2px,transparent_1.2px),linear-gradient(to_bottom,#f0f0f0_1.2px,transparent_1.2px)] bg-[size:6rem_4rem] transition-opacity duration-700 ease-in-out ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}>
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_1000px_at_80%_20%,#d5c5ff,transparent)]" />
          </div>

          {/* Dark Theme Background */}
          <div className={`absolute inset-0 h-full w-full bg-[#030014] bg-[linear-gradient(to_right,#1f1a3a_1.2px,transparent_1.2px),linear-gradient(to_bottom,#1f1a3a_1.2px,transparent_1.2px)] bg-[size:6rem_4rem] transition-opacity duration-700 ease-in-out ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}>
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_1000px_at_80%_20%,#1e1b4b,transparent)]" />
          </div>
        </div>
      )}

      <div className={`min-h-full flex flex-col transition-colors duration-300 ${
        theme === "dark" ? "text-neutral-100" : "text-neutral-900"
      }`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

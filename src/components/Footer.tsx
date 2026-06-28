"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const footerData = {
    brandName: "LinkChop",
    socialLinks: [
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        ),
        href: "https://github.com/therealvishnuvardhan/LinkChop",
        label: "GitHub"
      },
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
          </svg>
        ),
        href: "https://twitter.com",
        label: "Twitter"
      },
      {
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        ),
        href: "https://linkedin.com",
        label: "LinkedIn"
      },
    ],
    mainLinks: [
      { href: "/#about", label: "About" },
      { href: "/app", label: "Dashboard" },
    ],
    legalLinks: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
    ],
    copyright: {
      text: "© 2026 LinkChop. All rights reserved.",
      license: "MIT License",
    },
  };

  return (
    <footer className={`pb-6 pt-16 lg:pb-8 lg:pt-24 border-t transition-colors duration-500 w-full z-10 ${
      isDark ? "border-neutral-900 bg-neutral-950/40 text-neutral-400" : "border-neutral-100 bg-neutral-50/50 text-neutral-600"
    }`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        
        {/* Top Brand & Socials row */}
        <div className="md:flex md:items-start md:justify-between">
          <Link
            href="/"
            className="flex items-center gap-x-2 relative z-10"
            aria-label={footerData.brandName}
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="font-black text-black text-sm">FL</span>
            </div>
            <span className="font-bold text-xl">{footerData.brandName}</span>
          </Link>
          
          <ul className="flex list-none mt-6 md:mt-0 space-x-3">
            {footerData.socialLinks.map((link, i) => (
              <li key={i}>
                <a 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                    isDark 
                      ? "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white" 
                      : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black shadow-sm"
                  }`}
                >
                  {link.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Bottom links and legal row */}
        <div className={`border-t mt-6 pt-6 md:mt-4 md:pt-8 lg:grid lg:grid-cols-10 ${
          isDark ? "border-neutral-900" : "border-neutral-200"
        }`}>
          
          {/* Main Links */}
          <nav className="lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
              {footerData.mainLinks.map((link, i) => (
                <li key={i} className="my-1 mx-2 shrink-0">
                  <Link
                    href={link.href}
                    className={`text-sm underline-offset-4 hover:underline transition-colors ${
                      isDark ? "text-neutral-300 hover:text-white" : "text-neutral-700 hover:text-black"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Legal Links */}
          <div className="mt-6 lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
              {footerData.legalLinks.map((link, i) => (
                <li key={i} className="my-1 mx-3 shrink-0">
                  <a
                    href={link.href}
                    className="text-sm text-neutral-500 underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Copyright Info */}
          <div className="mt-6 text-sm leading-6 text-neutral-500 whitespace-nowrap lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
            <div>{footerData.copyright.text}</div>
            {footerData.copyright.license && (
              <div className="text-xs text-neutral-600 mt-0.5">{footerData.copyright.license}</div>
            )}
          </div>

        </div>
      </div>
    </footer>
  );
}

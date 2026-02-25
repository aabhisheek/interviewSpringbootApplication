"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-slate-700 text-white"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;

  const mobileLinkClass = (path: string) =>
    `block px-4 py-3 text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-slate-700 text-white"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-500 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Lightcast</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {user ? (
            <>
              <Link href="/" className={linkClass("/")}>Skills</Link>
              <Link href="/occupations" className={linkClass("/occupations")}>Occupations</Link>
              <Link href="/interview" className={linkClass("/interview")}>Interview</Link>
              <Link href="/interview2" className={linkClass("/interview2")}>Voice Interview</Link>

              <div className="ml-3 pl-3 border-l border-slate-700 flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold uppercase">
                    {user.name?.charAt(0) || "U"}
                  </div>
                  <span className="text-slate-300 text-sm hidden md:block">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>Login</Link>
              <Link
                href="/register"
                className="ml-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900">
          {user ? (
            <>
              <Link href="/" className={mobileLinkClass("/")} onClick={() => setMobileOpen(false)}>Skills</Link>
              <Link href="/occupations" className={mobileLinkClass("/occupations")} onClick={() => setMobileOpen(false)}>Occupations</Link>
              <Link href="/interview" className={mobileLinkClass("/interview")} onClick={() => setMobileOpen(false)}>Interview</Link>
              <Link href="/interview2" className={mobileLinkClass("/interview2")} onClick={() => setMobileOpen(false)}>Voice Interview</Link>
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold uppercase">
                    {user.name?.charAt(0) || "U"}
                  </div>
                  <span className="text-slate-300 text-sm">{user.name}</span>
                </div>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={mobileLinkClass("/login")} onClick={() => setMobileOpen(false)}>Login</Link>
              <Link href="/register" className={mobileLinkClass("/register")} onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const APPS = [
  { id: "dashboard", name: "Dashboard", description: "Study reports", href: "/" },
  { id: "captions", name: "Top Captions", description: "Most-liked", href: "/captions" },
  { id: "flavors", name: "Humor Flavors", description: "Style breakdown", href: "/flavors" },
  { id: "rate", name: "Rate Captions", description: "Saved votes", href: "/rate" },
];

export function AppSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        aria-label="App Switcher"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl focus:outline-none z-50 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Apps</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {APPS.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-100 bg-white p-4 text-center transition-all hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-900 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                onClick={() => setIsOpen(false)}
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{app.name}</span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{app.description}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="app-panel max-w-md rounded-3xl p-8 text-center">
        <span className="text-4xl" aria-hidden="true">🙈</span>
        <h1 className="mt-3 text-2xl font-semibold">This page isn&apos;t available</h1>
        <p className="app-muted mt-2 text-sm">
          The data for this page isn&apos;t set up in this environment yet.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/" className="app-button app-button-primary rounded-lg px-4 py-2 text-sm">
            Back home
          </Link>
          <button onClick={reset} className="app-button rounded-lg px-4 py-2 text-sm">
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}

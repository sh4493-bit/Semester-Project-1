import Link from "next/link";

export default function PublicProfileNotFound() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="app-panel w-full max-w-lg rounded-3xl p-8 text-center sm:p-10">
        <span className="text-5xl" aria-hidden="true">🕵️</span>
        <p className="app-kicker mt-5 text-xs font-semibold uppercase tracking-[0.24em]">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Nothing to see here (yet)</h1>
        <p className="app-muted mt-3 text-sm leading-relaxed">
          This humor page may not exist, or its owner has chosen to keep it private.
        </p>
        <Link
          href="/"
          className="app-button app-button-primary mt-6 inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-semibold"
        >
          Back to The LOL Report
        </Link>
      </section>
    </main>
  );
}

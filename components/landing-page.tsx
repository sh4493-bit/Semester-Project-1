import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signInWithGoogleAction } from "@/app/actions/auth";
import { LandingRateTeaser, type TeaserCaption } from "@/components/landing-rate-teaser";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";

type Stats = { caption_count: number; vote_count: number; rater_count: number; page_count: number };

export async function LandingPage() {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [{ data: statsRows }, { data: captionRows }] = await Promise.all([
    supabase.from("public_landing_stats").select("*").limit(1),
    supabase.from("public_landing_captions").select("*"),
  ]);

  const stats = (statsRows?.[0] ?? null) as Stats | null;
  const captions = (captionRows ?? []) as TeaserCaption[];
  const tiles = stats
    ? [
        ["Captions", stats.caption_count],
        ["Ratings", stats.vote_count],
        ["Raters", stats.rater_count],
        ["Humor pages", stats.page_count],
      ]
    : [];

  return (
    <main className="page-shell min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">
            The LOL Report
          </p>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={signInWithGoogleAction}>
              <button type="submit" className="app-button rounded-full px-4 py-2 text-sm font-semibold">
                Sign in
              </button>
            </form>
          </div>
        </div>

        <section className="mt-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            What&apos;s your sense of humor?
          </h1>
          <p className="app-muted mx-auto mt-4 max-w-xl text-base sm:text-lg">
            Rate a few captions, see how you compare to everyone else, and get a page of your own
            to share with friends.
          </p>
        </section>

        {tiles.length > 0 ? (
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="app-panel rounded-2xl p-4 text-center">
                <dd className="text-3xl font-semibold">{Number(value).toLocaleString()}</dd>
                <dt className="app-muted mt-1 text-xs uppercase tracking-wider">{label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        {captions.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-4 text-center text-2xl font-semibold">Try it: rate a few</h2>
            <LandingRateTeaser captions={captions} signInAction={signInWithGoogleAction} />
          </section>
        ) : null}

        {captions.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-2xl font-semibold">Crowd favorites right now</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {captions.slice(0, 3).map((caption, index) => (
                <li key={caption.id} className="app-panel rounded-3xl p-4">
                  {caption.image_url ? (
                    <Image
                      src={caption.image_url}
                      alt=""
                      width={1200}
                      height={900}
                      unoptimized
                      className="max-h-56 w-full rounded-2xl object-contain"
                    />
                  ) : null}
                  <p className="mt-3 text-sm">{caption.content}</p>
                  <p className="app-muted mt-2 text-xs">
                    #{index + 1} · 😂 {caption.up_votes}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="app-panel mt-16 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-semibold">Your taste, your page</h2>
          <p className="app-muted mx-auto mt-2 max-w-lg text-sm">
            Pick a theme, showcase your favorite captions and share one link. Private until you say
            otherwise.
          </p>
          <form action={signInWithGoogleAction} className="mt-5">
            <button
              type="submit"
              className="app-button app-button-primary rounded-full px-6 py-3 text-sm font-semibold"
            >
              Continue with Google
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

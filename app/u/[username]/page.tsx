import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { CopyProfileLinkButton } from "@/components/copy-profile-link-button";
import { isPublicProfileTheme, PUBLIC_PROFILE_THEMES } from "@/utils/public-profile";
import { createClient } from "@/utils/supabase/server";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,19}$/.test(username)) {
    return { title: "Page not found · The LOL Report" };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_public_profile_showcase")
    .select("display_name, bio, avatar_emoji")
    .eq("username", username)
    .limit(1);
  const profile = data?.[0];
  if (!profile) {
    return { title: "Page not found · The LOL Report" };
  }

  return {
    title: `${profile.avatar_emoji} ${profile.display_name} (@${username}) · The LOL Report`,
    description: profile.bio || `${profile.display_name}'s humor page on The LOL Report.`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  if (!/^[a-z0-9][a-z0-9_-]{2,19}$/.test(username)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("user_public_profile_showcase")
    .select("*")
    .eq("username", username);

  if (error) {
    throw new Error(`Unable to load public humor page: ${error.message}`);
  }

  const profile = rows?.[0];
  if (!profile) {
    notFound();
  }

  if (!isPublicProfileTheme(profile.theme)) {
    throw new Error("The public profile has an unsupported theme.");
  }

  const { data: styleRows } = await supabase
    .from("user_public_profile_humor_style")
    .select("*")
    .eq("username", username)
    .limit(1);
  const style = styleRows?.[0];
  const votesCast = style?.votes_cast_count ?? 0;
  const upvotePct =
    votesCast > 0 ? Math.round(((style?.upvotes_cast_count ?? 0) / votesCast) * 100) : null;
  const topFlavor = style?.top_flavor?.replace(/[-_]+/g, " ") ?? null;
  const alsoInto = (style?.top_flavors ?? [])
    .filter((flavor) => flavor !== style?.top_flavor)
    .map((flavor) => flavor.replace(/[-_]+/g, " "));

  const theme = PUBLIC_PROFILE_THEMES[profile.theme];
  const favorites = (rows ?? []).filter(
    (row) => row.caption_id !== null && row.caption_content?.trim(),
  );

  return (
    <main className={`min-h-screen px-4 py-10 sm:px-6 sm:py-16 ${theme.page}`}>
      <div className="mx-auto max-w-4xl">
        <header className={`rounded-[2rem] border p-7 shadow-sm sm:p-12 ${theme.card}`}>
          <div className="flex flex-col items-center text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/75 text-5xl shadow-sm">
              {profile.avatar_emoji}
            </span>
            <p className={`mt-6 text-xs font-bold uppercase tracking-[0.24em] ${theme.accent}`}>
              A humor page
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">
              {profile.display_name}
            </h1>
            <p className="mt-2 text-sm opacity-65">@{profile.username}</p>
            {profile.bio ? (
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-80 sm:text-lg">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </header>

        <section className="mt-8">
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.accent}`}>
            Humor style
          </p>
          <h2 className="mb-4 mt-1 text-2xl font-semibold">How they laugh</h2>
          {votesCast === 0 && (style?.public_caption_count ?? 0) === 0 ? (
            <div className={`rounded-3xl border p-6 text-center text-sm opacity-80 ${theme.card}`}>
              Rate a few items to fill your page.
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Captions shared", String(style?.public_caption_count ?? 0)],
                ["Items rated", String(votesCast)],
                ["Liked", upvotePct === null ? "—" : `${upvotePct}%`],
                ["Signature style", topFlavor ?? "Still forming"],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-2xl border p-4 ${theme.card}`}>
                  <dt className="text-xs opacity-65">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {alsoInto.length > 0 ? (
            <p className="mt-3 text-sm opacity-75">
              Also into: <span className="capitalize">{alsoInto.join(", ")}</span>
            </p>
          ) : null}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.accent}`}>
                The good stuff
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Favorites that feel like me</h2>
            </div>
            <span className="text-sm opacity-65">
              {favorites.length} {favorites.length === 1 ? "favorite" : "favorites"}
            </span>
          </div>

          {favorites.length === 0 ? (
            <div className={`rounded-3xl border p-8 text-center sm:p-12 ${theme.card}`}>
              <span className="text-4xl" aria-hidden="true">🪄</span>
              <h3 className="mt-3 text-lg font-semibold">The collection is just getting started</h3>
              <p className="mt-2 text-sm opacity-70">
                Rate a few items to fill this page. Check back for the laughs.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {favorites.map((favorite) => (
                <article
                  key={favorite.caption_id}
                  className={`rounded-3xl border p-4 shadow-sm ${theme.card}`}
                >
                  {favorite.image_url ? (
                    <Image
                      src={favorite.image_url}
                      alt=""
                      width={1200}
                      height={900}
                      unoptimized
                      className="max-h-80 w-full rounded-2xl bg-white/70 object-contain"
                    />
                  ) : null}
                  <p className="mt-3 text-base leading-relaxed">{favorite.caption_content}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-xs opacity-65">A tiny corner for a big sense of humor.</p>
          <CopyProfileLinkButton username={profile.username} />
        </footer>
      </div>
    </main>
  );
}

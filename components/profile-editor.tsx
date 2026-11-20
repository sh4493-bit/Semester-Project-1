"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

import {
  savePublicProfile,
  type SavePublicProfileResult,
} from "@/app/actions/public-profile";
import { CopyProfileLinkButton } from "@/components/copy-profile-link-button";
import {
  PUBLIC_PROFILE_THEMES,
  type PublicProfileTheme,
} from "@/utils/public-profile";
import type { Tables } from "@/src/types/supabase";

type FavoriteOption = {
  captionId: string;
  content: string;
  imageUrl: string | null;
};

type ProfileEditorProps = {
  initialProfile: Tables<"user_public_profiles"> | null;
  initialUsername: string;
  initialDisplayName: string;
  favorites: FavoriteOption[];
};

const isTheme = (theme: string): theme is PublicProfileTheme =>
  Object.hasOwn(PUBLIC_PROFILE_THEMES, theme);

export function ProfileEditor({
  initialProfile,
  initialUsername,
  initialDisplayName,
  favorites,
}: ProfileEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SavePublicProfileResult>({});
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [avatarEmoji, setAvatarEmoji] = useState(initialProfile?.avatar_emoji ?? "😎");
  const [theme, setTheme] = useState<PublicProfileTheme>(
    initialProfile && isTheme(initialProfile.theme) ? initialProfile.theme : "sunset",
  );
  const [isPublic, setIsPublic] = useState(initialProfile?.is_public ?? false);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState(
    new Set(initialProfile?.featured_caption_ids ?? []),
  );
  const [isPagePublic, setIsPagePublic] = useState(initialProfile?.is_public ?? false);
  const [publishedUsername, setPublishedUsername] = useState(
    initialProfile?.is_public ? initialProfile.username : null,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult({});
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const saveResult = await savePublicProfile(formData);
      setResult(saveResult);
      if (saveResult.success) {
        setIsPagePublic(isPublic);
        setPublishedUsername(isPublic ? saveResult.username ?? username : null);
      }
    });
  };

  const toggleFavorite = (captionId: string) => {
    setSelectedCaptionIds((current) => {
      const next = new Set(current);
      if (next.has(captionId)) {
        next.delete(captionId);
      } else if (next.size < 6) {
        next.add(captionId);
      } else {
        setResult({ error: "You can showcase up to 6 favorites." });
      }
      return next;
    });
  };

  const shareUsername =
    isPagePublic && publishedUsername
      ? publishedUsername
      : result.username ?? username.toLowerCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
      <form onSubmit={handleSubmit} className="app-panel rounded-3xl p-5 sm:p-8">
        <section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker text-xs font-semibold uppercase tracking-[0.2em]">
                1 · Your identity
              </p>
              <h2 className="mt-2 text-xl font-semibold">Make it feel like you</h2>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-3xl shadow-sm">
              {avatarEmoji || "😎"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Username
              <span className="app-muted mt-1 block text-xs font-normal">
                Your link: /u/{username || "username"}
              </span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="app-input mt-2 h-11 w-full rounded-xl px-3 text-sm"
              />
              <span className="app-muted mt-1 block text-xs font-normal">
                3–20 letters, numbers, hyphens, or underscores
              </span>
            </label>
            <label className="text-sm font-medium">
              Display name
              <input
                name="displayName"
                required
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="app-input mt-2 h-11 w-full rounded-xl px-3 text-sm"
              />
            </label>
            <label className="text-sm font-medium">
              Avatar emoji
              <input
                name="avatarEmoji"
                required
                maxLength={8}
                value={avatarEmoji}
                onChange={(event) => setAvatarEmoji(event.target.value)}
                className="app-input mt-2 h-11 w-full rounded-xl px-3 text-lg"
                aria-describedby="avatar-hint"
              />
              <span id="avatar-hint" className="app-muted mt-1 block text-xs font-normal">
                An emoji keeps setup quick; image uploads can come later.
              </span>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Short bio
              <textarea
                name="bio"
                maxLength={180}
                rows={3}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="What kind of humor gets you every time?"
                className="app-input mt-2 w-full resize-y rounded-xl px-3 py-2 text-sm"
              />
              <span className="app-muted mt-1 block text-right text-xs font-normal">
                {bio.length}/180
              </span>
            </label>
          </div>
        </section>

        <section className="mt-8 border-t border-slate-400/20 pt-6">
          <p className="app-kicker text-xs font-semibold uppercase tracking-[0.2em]">
            2 · Set the vibe
          </p>
          <h2 className="mt-2 text-xl font-semibold">Choose a theme</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(PUBLIC_PROFILE_THEMES).map(([themeId, option]) => {
              const typedTheme = themeId as PublicProfileTheme;
              return (
                <label
                  key={themeId}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                    theme === typedTheme
                      ? "border-slate-900/50 bg-white/70 ring-2 ring-slate-900/10"
                      : "border-slate-400/20 bg-white/30 hover:bg-white/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={themeId}
                    checked={theme === typedTheme}
                    onChange={() => setTheme(typedTheme)}
                    className="sr-only"
                  />
                  <span className={`h-12 w-12 shrink-0 rounded-xl ${option.swatch}`} />
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="app-muted block text-xs">{option.description}</span>
                  </span>
                  {theme === typedTheme ? (
                    <span className="ml-auto text-sm font-semibold" aria-label="Selected">
                      ✓
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-400/20 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="app-kicker text-xs font-semibold uppercase tracking-[0.2em]">
                3 · Your favorites
              </p>
              <h2 className="mt-2 text-xl font-semibold">Pick up to 6 to show off</h2>
            </div>
            <span className="app-muted text-xs">{selectedCaptionIds.size}/6 selected</span>
          </div>
          {favorites.length === 0 ? (
            <p className="app-muted mt-4 rounded-2xl border border-dashed border-slate-400/30 p-5 text-sm">
              No public captions to showcase yet. Create a caption in Crackd and make it public to fill your page.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {favorites.map((favorite) => (
                <label
                  key={favorite.captionId}
                  className="cursor-pointer rounded-2xl border border-slate-400/20 bg-white/40 p-3"
                >
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      name="featuredCaptionIds"
                      value={favorite.captionId}
                      checked={selectedCaptionIds.has(favorite.captionId)}
                      onChange={() => toggleFavorite(favorite.captionId)}
                    />
                    Showcase this favorite
                  </span>
                  {favorite.imageUrl ? (
                    <Image
                      src={favorite.imageUrl}
                      alt=""
                      width={800}
                      height={600}
                      unoptimized
                      className="h-40 w-full rounded-xl bg-white object-contain"
                    />
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed">{favorite.content}</p>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-400/20 bg-white/30 p-4">
          <div className="flex items-start gap-3">
            <input
              id="is-public"
              name="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-600"
            />
            <label htmlFor="is-public">
              <span className="block text-sm font-semibold">Make my page public</span>
              <span className="app-muted mt-1 block text-xs leading-relaxed">
                Private by default. When public, anyone with your link can see your name, bio,
                emoji, theme, and selected public favorites.
              </span>
            </label>
          </div>
        </section>

        {result.error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-900">
            {result.error}
          </p>
        ) : null}
        {result.success ? (
          <p role="status" className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
            {result.success}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="app-button app-button-primary min-h-12 rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save my page"}
          </button>
          <span className="app-muted text-xs">You can change these settings anytime.</span>
        </div>
      </form>

      <aside className="app-panel h-fit rounded-3xl p-5 sm:p-7">
        <p className="app-kicker text-xs font-semibold uppercase tracking-[0.2em]">Your link</p>
        <h2 className="mt-2 text-xl font-semibold">Ready when you are</h2>
        <p className="app-muted mt-2 break-all text-sm">
          /u/{shareUsername}
        </p>
        <div className="mt-4">
          <CopyProfileLinkButton username={shareUsername} disabled={!isPagePublic} />
        </div>
        {!isPagePublic ? (
          <p className="app-muted -mt-2 text-xs">
            Save and make your page public to share this link.
          </p>
        ) : null}
        <div className="mt-6 rounded-2xl border border-slate-400/20 bg-white/30 p-4">
          <p className="text-sm font-semibold">A quick privacy check</p>
          <p className="app-muted mt-2 text-xs leading-relaxed">
            Your email and account details are never shown. Only the profile details above and
            favorites you choose will appear on the public page.
          </p>
        </div>
      </aside>
    </div>
  );
}

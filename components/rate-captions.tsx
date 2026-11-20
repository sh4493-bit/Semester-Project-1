"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";

import { submitVotes } from "@/app/actions/votes";

export type RateCaption = {
  id: string;
  content: string;
  imageUrl: string | null;
  up: number;
  down: number;
};

export function RateCaptions({ captions }: { captions: RateCaption[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<"up" | "down" | null>(null);
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const caption = captions[index];

  if (!caption) {
    return (
      <div className="app-panel mt-8 rounded-3xl p-10 text-center">
        <span className="text-4xl" aria-hidden="true">🎉</span>
        <h2 className="mt-3 text-xl font-semibold">
          {saved > 0 ? `You rated ${saved} caption${saved === 1 ? "" : "s"}!` : "You've rated everything"}
        </h2>
        <p className="app-muted mt-2 text-sm">
          Your ratings now shape the humor style on your page.
        </p>
        <Link
          href="/profile"
          className="app-button app-button-primary mt-5 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
        >
          See my humor page
        </Link>
      </div>
    );
  }

  const rate = (value: "up" | "down") => {
    if (picked || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitVotes([{ captionId: caption.id, value: value === "up" ? 1 : -1 }]);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved((count) => count + result.saved);
      setPicked(value);
    });
  };

  const total = caption.up + caption.down + (picked ? 1 : 0);
  const ups = caption.up + (picked === "up" ? 1 : 0);
  const crowdPct = total > 0 ? Math.round((ups / total) * 100) : null;

  return (
    <div className="app-panel mx-auto mt-8 w-full max-w-md rounded-3xl p-5">
      <p className="app-muted mb-3 text-xs">
        Caption {index + 1} of {captions.length}
      </p>
      {caption.imageUrl ? (
        <Image
          src={caption.imageUrl}
          alt=""
          width={1200}
          height={900}
          unoptimized
          className="max-h-72 w-full rounded-2xl object-contain"
        />
      ) : null}
      <p className="mt-3 text-lg font-medium">{caption.content}</p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {picked === null ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => rate("down")}
            disabled={isPending}
            className="app-button rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            😐 Not for me
          </button>
          <button
            onClick={() => rate("up")}
            disabled={isPending}
            className="app-button app-button-primary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            😂 Funny
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm">
            Saved! {crowdPct}% of raters found this funny. You said{" "}
            {picked === "up" ? "funny" : "not for me"}.
          </p>
          <button
            onClick={() => {
              setPicked(null);
              setIndex((current) => current + 1);
            }}
            className="app-button mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {index + 1 < captions.length ? "Next caption →" : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}

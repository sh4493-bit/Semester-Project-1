"use client";

import { useState } from "react";
import Image from "next/image";

export type TeaserCaption = {
  id: string;
  content: string;
  image_url: string | null;
  up_votes: number;
  down_votes: number;
};

export function LandingRateTeaser({
  captions,
  signInAction,
}: {
  captions: TeaserCaption[];
  signInAction: () => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<"up" | "down" | null>(null);
  const [rated, setRated] = useState(0);

  const caption = captions[index % captions.length];
  const total = caption.up_votes + caption.down_votes;
  const crowdPct = total > 0 ? Math.round((caption.up_votes / total) * 100) : null;
  const done = rated >= 3 && picked !== null;

  const rate = (value: "up" | "down") => {
    if (picked) return;
    setPicked(value);
    setRated((count) => count + 1);
  };

  const next = () => {
    setPicked(null);
    setIndex((current) => current + 1);
  };

  return (
    <div className="app-panel mx-auto w-full max-w-md rounded-3xl p-5">
      {caption.image_url ? (
        <Image
          src={caption.image_url}
          alt=""
          width={1200}
          height={900}
          unoptimized
          className="max-h-72 w-full rounded-2xl object-contain"
        />
      ) : null}
      <p className="mt-3 text-lg font-medium">{caption.content}</p>

      {picked === null ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => rate("down")}
            className="app-button rounded-xl px-4 py-3 text-sm font-semibold"
          >
            😐 Not for me
          </button>
          <button
            onClick={() => rate("up")}
            className="app-button app-button-primary rounded-xl px-4 py-3 text-sm font-semibold"
          >
            😂 Funny
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm">
            {crowdPct === null
              ? "You're the first to rate this one!"
              : `${crowdPct}% of raters found this funny. You said ${picked === "up" ? "funny" : "not for me"}.`}
          </p>
          {done ? (
            <form action={signInAction} className="mt-4">
              <p className="app-muted mb-3 text-sm">
                That&apos;s {rated} ratings. Sign in to save your taste and get your own humor page.
              </p>
              <button
                type="submit"
                className="app-button app-button-primary w-full rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Save my humor profile
              </button>
            </form>
          ) : (
            <button onClick={next} className="app-button mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold">
              Next caption →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

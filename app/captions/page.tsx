import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";

import { TopNavbar } from "@/components/top-navbar";
import { createClient } from "@/utils/supabase/server";

export default async function TopCaptionsPage() {
  const supabase = await createClient();
  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, content, image_id, like_count, voice")
    .not("content", "is", null)
    .order("like_count", { ascending: false })
    .limit(24);

  if (error) {
    throw new Error(`Unable to load captions: ${error.message}`);
  }

  const imageIds = [...new Set((captions ?? []).map((caption) => caption.image_id))];
  const imageUrls = new Map<string, string>();
  if (imageIds.length > 0) {
    const { data: images } = await supabase.from("images").select("id, url").in("id", imageIds);
    for (const image of images ?? []) {
      if (image.url) imageUrls.set(image.id, image.url);
    }
  }

  type Card = { id: string; text: string; imageUrl: string | null; meta: string };
  let cards: Card[] = (captions ?? []).map((caption) => ({
    id: caption.id,
    text: caption.content ?? "",
    imageUrl: imageUrls.get(caption.image_id) ?? null,
    meta: `${caption.like_count ?? 0} likes${caption.voice ? ` · ${caption.voice}` : ""}`,
  }));

  // Fall back to the caption feed when the captions table has nothing to show.
  if (cards.length === 0) {
    const loose = supabase as unknown as SupabaseClient;
    const { data: feed } = await loose
      .from("caption_feed")
      .select("id, caption, tone, up_votes, down_votes")
      .order("up_votes", { ascending: false })
      .limit(24);
    cards = (feed ?? []).map(
      (row: { id: string; caption: string | null; tone: string | null; up_votes: number | null; down_votes: number | null }) => ({
        id: row.id,
        text: row.caption ?? "",
        imageUrl: null,
        meta: `${row.up_votes ?? 0} up · ${row.down_votes ?? 0} down${row.tone ? ` · ${row.tone}` : ""}`,
      }),
    );
  }

  return (
    <>
      <TopNavbar />
      <main className="page-shell min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">Leaderboard</p>
          <h1 className="mt-2 text-3xl font-semibold">Top captions</h1>
          <p className="app-muted mt-2 text-sm">The most-liked captions across Crackd.</p>

          {cards.length === 0 ? (
            <div className="app-panel mt-8 rounded-3xl p-10 text-center text-sm">
              No captions yet.
            </div>
          ) : (
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {cards.map((card, index) => (
                <li key={card.id} className="app-panel rounded-3xl p-4">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt=""
                      width={1200}
                      height={900}
                      unoptimized
                      className="max-h-72 w-full rounded-2xl object-contain"
                    />
                  ) : null}
                  <p className="mt-3 text-base">{card.text}</p>
                  <p className="app-muted mt-2 text-xs">
                    #{index + 1} · {card.meta}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}

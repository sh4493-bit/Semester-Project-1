import type { SupabaseClient } from "@supabase/supabase-js";

import { RateCaptions, type RateCaption } from "@/components/rate-captions";
import { TopNavbar } from "@/components/top-navbar";
import { createClient } from "@/utils/supabase/server";

export default async function RatePage() {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myVotes } = await supabase
    .from("caption_votes")
    .select("caption_id")
    .eq("profile_id", user?.id ?? "");
  const ratedIds = new Set((myVotes ?? []).map((vote: { caption_id: string }) => vote.caption_id));

  const { data: captionRows, error } = await supabase
    .from("captions")
    .select("id, content, image_id")
    .eq("is_public", true)
    .not("content", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Unable to load captions: ${error.message}`);
  }

  const queue = (captionRows ?? [])
    .filter((row: { id: string }) => !ratedIds.has(row.id))
    .slice(0, 10) as { id: string; content: string; image_id: string }[];

  const ids = queue.map((row) => row.id);
  const imageIds = [...new Set(queue.map((row) => row.image_id))];
  const [{ data: images }, { data: counts }] = await Promise.all([
    imageIds.length
      ? supabase.from("images").select("id, url").in("id", imageIds)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("caption_vote_counts").select("caption_id, up_votes, down_votes").in("caption_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const imageUrl = new Map((images ?? []).map((row: { id: string; url: string | null }) => [row.id, row.url]));
  const crowd = new Map(
    (counts ?? []).map((row: { caption_id: string; up_votes: number; down_votes: number }) => [
      row.caption_id,
      row,
    ]),
  );

  const captions: RateCaption[] = queue.map((row) => ({
    id: row.id,
    content: row.content,
    imageUrl: imageUrl.get(row.image_id) ?? null,
    up: crowd.get(row.id)?.up_votes ?? 0,
    down: crowd.get(row.id)?.down_votes ?? 0,
  }));

  return (
    <>
      <TopNavbar />
      <main className="page-shell min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">Your taste</p>
          <h1 className="mt-2 text-3xl font-semibold">Rate captions</h1>
          <p className="app-muted mt-2 text-sm">
            Every rating is saved and shapes the humor style on your page.
          </p>
        </div>
        <RateCaptions captions={captions} />
      </main>
    </>
  );
}

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";

export type VoteInput = { captionId: string; value: 1 | -1 };
export type SubmitVotesResult = { saved: number; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitVotes(votes: VoteInput[]): Promise<SubmitVotesResult> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { saved: 0, error: "Please sign in to save your ratings." };
  }

  const valid = votes
    .filter((vote) => UUID.test(vote.captionId) && (vote.value === 1 || vote.value === -1))
    .slice(0, 25);
  const unique = [...new Map(valid.map((vote) => [vote.captionId, vote])).values()];
  if (unique.length === 0) {
    return { saved: 0 };
  }

  const { data: existing, error: existingError } = await supabase
    .from("caption_votes")
    .select("caption_id")
    .eq("profile_id", user.id)
    .in("caption_id", unique.map((vote) => vote.captionId));

  if (existingError) {
    return { saved: 0, error: `Unable to save your rating: ${existingError.message}` };
  }

  const alreadyRated = new Set((existing ?? []).map((row: { caption_id: string }) => row.caption_id));
  const rows = unique
    .filter((vote) => !alreadyRated.has(vote.captionId))
    .map((vote) => ({
      caption_id: vote.captionId,
      profile_id: user.id,
      vote_value: vote.value,
      is_from_study: true,
    }));

  if (rows.length === 0) {
    return { saved: 0 };
  }

  const { error } = await supabase.from("caption_votes").insert(rows);
  if (error) {
    return { saved: 0, error: `Unable to save your rating: ${error.message}` };
  }

  return { saved: rows.length };
}

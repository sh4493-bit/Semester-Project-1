"use server";

import { revalidatePath } from "next/cache";

import { isPublicProfileTheme, isValidUsername } from "@/utils/public-profile";
import { createClient } from "@/utils/supabase/server";
import { isSuperadminProfile } from "@/utils/supabase/superadmin";

export type SavePublicProfileResult = {
  error?: string;
  success?: string;
  username?: string;
};

const getText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function savePublicProfile(
  formData: FormData,
): Promise<SavePublicProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isSuperadminProfile(supabase, user.id))) {
    return { error: "Please sign in with an authorized account to edit your page." };
  }

  const username = getText(formData, "username").toLowerCase();
  const displayName = getText(formData, "displayName");
  const bio = getText(formData, "bio");
  const avatarEmoji = getText(formData, "avatarEmoji");
  const theme = getText(formData, "theme");
  const isPublic = formData.get("isPublic") === "on";
  const featuredCaptionIds = [
    ...new Set(formData.getAll("featuredCaptionIds").map(String)),
  ];

  if (!isValidUsername(username)) {
    return {
      error: "Username must be 3–20 characters: lowercase letters, numbers, hyphens, or underscores.",
    };
  }

  if (displayName.length < 1 || displayName.length > 60) {
    return { error: "Display name must be between 1 and 60 characters." };
  }

  if (bio.length > 180) {
    return { error: "Bio must be 180 characters or fewer." };
  }

  if ([...avatarEmoji].length < 1 || [...avatarEmoji].length > 8) {
    return { error: "Choose an emoji using 1–8 characters." };
  }

  if (!isPublicProfileTheme(theme)) {
    return { error: "Choose one of the available page themes." };
  }

  if (featuredCaptionIds.length > 6) {
    return { error: "Choose up to 6 favorites to showcase." };
  }

  const { data: previousProfile, error: previousProfileError } = await supabase
    .from("user_public_profiles")
    .select("username")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (previousProfileError) {
    return { error: `Unable to load your current page: ${previousProfileError.message}` };
  }

  if (featuredCaptionIds.length > 0) {
    const [{ data: publicCaptions, error: publicCaptionsError }, { data: likedVotes, error: likedVotesError }] =
      await Promise.all([
        supabase
          .from("captions")
          .select("id,user_id")
          .eq("is_public", true)
          .in("id", featuredCaptionIds),
        supabase
          .from("caption_votes")
          .select("caption_id")
          .eq("profile_id", user.id)
          .gt("vote_value", 0)
          .in("caption_id", featuredCaptionIds),
      ]);

    if (publicCaptionsError || likedVotesError) {
      return {
        error: `Unable to verify your favorites: ${(publicCaptionsError ?? likedVotesError)?.message}`,
      };
    }

    const liked = new Set((likedVotes ?? []).map((vote) => vote.caption_id));
    const allowed = new Set(
      (publicCaptions ?? [])
        .filter((caption) => caption.user_id === user.id || liked.has(caption.id))
        .map((caption) => caption.id),
    );

    if (featuredCaptionIds.some((id) => !allowed.has(id))) {
      return { error: "Only your own public captions or captions you rated funny can be showcased." };
    }
  }

  const { error: saveError } = await supabase
    .from("user_public_profiles")
    .upsert(
      {
        profile_id: user.id,
        username,
        display_name: displayName,
        bio,
        avatar_emoji: avatarEmoji,
        theme,
        is_public: isPublic,
        featured_caption_ids: featuredCaptionIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );

  if (saveError) {
    if (saveError.code === "23505") {
      return { error: "That username is already taken. Try another one." };
    }

    return { error: `Unable to save your page: ${saveError.message}` };
  }

  revalidatePath("/profile");
  revalidatePath(`/u/${username}`);
  if (previousProfile?.username && previousProfile.username !== username) {
    revalidatePath(`/u/${previousProfile.username}`);
  }

  return {
    success: isPublic
      ? "Your page is saved and public."
      : "Your page is saved and private.",
    username,
  };
}

import { redirect } from "next/navigation";

import { ProfileEditor } from "@/components/profile-editor";
import { TopNavbar } from "@/components/top-navbar";
import { createClient } from "@/utils/supabase/server";
import { isSuperadminProfile } from "@/utils/supabase/superadmin";

type FavoriteOption = {
  captionId: string;
  content: string;
  imageUrl: string | null;
  source: "liked" | "mine";
};

const makeUsernameSuggestion = (email: string | undefined, userId: string) => {
  const emailName = email?.split("@")[0] ?? "";
  const slug = emailName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9_-]+$/g, "")
    .slice(0, 20);

  return slug.length >= 3 ? slug : `user-${userId.slice(0, 8)}`;
};

export default async function ProfileEditorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isSuperadminProfile(supabase, user.id))) {
    redirect("/login");
  }

  const [
    { data: profile, error: profileError },
    { data: nameData, error: nameError },
    { data: ownCaptions, error: ownCaptionsError },
    { data: likedVotes, error: likedVotesError },
  ] = await Promise.all([
    supabase
      .from("user_public_profiles")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("first_name,last_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("captions")
      .select("id,content,image_id")
      .eq("user_id", user.id)
      .eq("is_public", true)
      .order("created_datetime_utc", { ascending: false }),
    supabase
      .from("caption_votes")
      .select("caption_id")
      .eq("profile_id", user.id)
      .gt("vote_value", 0)
      .order("created_datetime_utc", { ascending: false })
      .limit(100),
  ]);

  if (profileError) {
    throw new Error(`Unable to load your public page settings: ${profileError.message}`);
  }
  if (nameError) {
    throw new Error(`Unable to load your display name: ${nameError.message}`);
  }
  if (ownCaptionsError) {
    throw new Error(`Unable to load your public captions: ${ownCaptionsError.message}`);
  }
  if (likedVotesError) {
    throw new Error(`Unable to load your ratings: ${likedVotesError.message}`);
  }

  // Favorites come from your own activity: captions you rated funny, plus your own public captions.
  const ownIds = new Set((ownCaptions ?? []).map((caption) => caption.id));
  const likedIds = [...new Set((likedVotes ?? []).map((vote) => vote.caption_id))].filter(
    (id) => !ownIds.has(id),
  );

  let likedCaptions: { id: string; content: string | null; image_id: string }[] = [];
  if (likedIds.length > 0) {
    const { data, error: likedCaptionsError } = await supabase
      .from("captions")
      .select("id,content,image_id")
      .in("id", likedIds)
      .eq("is_public", true);
    if (likedCaptionsError) {
      throw new Error(`Unable to load captions you liked: ${likedCaptionsError.message}`);
    }
    likedCaptions = data ?? [];
  }

  const captions = [
    ...likedCaptions.map((caption) => ({ ...caption, source: "liked" as const })),
    ...(ownCaptions ?? []).map((caption) => ({ ...caption, source: "mine" as const })),
  ];

  const imageIds = [...new Set(captions.map((caption) => caption.image_id))];
  let imageUrls = new Map<string, string>();
  if (imageIds.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from("images")
      .select("id,url")
      .in("id", imageIds)
      .eq("is_public", true);

    if (imagesError) {
      throw new Error(`Unable to load caption images: ${imagesError.message}`);
    }

    imageUrls = new Map(
      (images ?? [])
        .filter((image): image is typeof image & { url: string } => Boolean(image.url))
        .map((image) => [image.id, image.url]),
    );
  }

  const favorites: FavoriteOption[] = captions.map((caption) => ({
    captionId: caption.id,
    content: caption.content?.trim() || "A public caption",
    imageUrl: imageUrls.get(caption.image_id) ?? null,
    source: caption.source,
  }));

  const nameFromProfile = [nameData?.first_name, nameData?.last_name]
    .filter(Boolean)
    .join(" ");
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const displayName =
    profile?.display_name || nameFromProfile || metadataName || "Your name";

  return (
    <>
      <TopNavbar />
      <main className="page-shell min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">
              Your little corner of the internet
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Make your humor page</h1>
            <p className="app-muted mt-2 max-w-2xl text-sm">
              Pick a name, choose a look, and save a few favorites. Your page stays private until
              you decide to publish it.
            </p>
          </header>
          <ProfileEditor
            initialProfile={profile}
            initialUsername={profile?.username ?? makeUsernameSuggestion(user.email, user.id)}
            initialDisplayName={displayName}
            favorites={favorites}
          />
        </div>
      </main>
    </>
  );
}

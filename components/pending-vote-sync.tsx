"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { submitVotes, type VoteInput } from "@/app/actions/votes";

export const PENDING_VOTES_KEY = "lol-pending-votes";

export function PendingVoteSync() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let votes: VoteInput[] = [];
    try {
      votes = JSON.parse(window.localStorage.getItem(PENDING_VOTES_KEY) ?? "[]");
    } catch {
      votes = [];
    }
    if (!Array.isArray(votes) || votes.length === 0) return;

    void submitVotes(votes).then((result) => {
      try {
        window.localStorage.removeItem(PENDING_VOTES_KEY);
      } catch {
        // ignore storage errors
      }
      if (result.saved > 0) {
        setMessage(`Saved ${result.saved} rating${result.saved === 1 ? "" : "s"} from before you signed in.`);
        router.refresh();
      }
    });
  }, [router]);

  if (!message) return null;
  return (
    <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      {message}
    </p>
  );
}

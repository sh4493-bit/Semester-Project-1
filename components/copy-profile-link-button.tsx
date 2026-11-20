"use client";

import { useState } from "react";

export function CopyProfileLinkButton({
  username,
  disabled = false,
}: {
  username: string;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`);
      setMessage("Link copied!");
    } catch {
      setMessage("Couldn’t copy the link. Copy it from your browser’s address bar instead.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={copyLink}
        disabled={disabled}
        className="app-button app-button-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        Copy page link
      </button>
      <p className="mt-2 min-h-5 text-xs" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

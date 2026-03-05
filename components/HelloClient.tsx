"use client";

import { useState } from "react";

export default function HelloClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hello");
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? "No message field in response");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Calling API..." : "Call /api/hello"}
      </button>
      {message && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          API response: <span className="font-mono">{message}</span>
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      )}
    </div>
  );
}


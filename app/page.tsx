 "use client";

import { useState } from "react";
import type { LawBook } from "@/lib/law/types";
import DocumentWithChat from "@/components/DocumentWithChat";
import livres from "./data/erp_livre1.json";

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  return (
    <main className="flex h-screen flex-col bg-white font-sans text-zinc-900">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 md:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Règlement de sécurité ERP
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Consultez le texte du règlement et interrogez l&apos;assistant pour
            obtenir des références.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Ouvrir la recherche"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L19 20.5 20.5 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsBookmarksOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Ouvrir les signets"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15.11-5-2.15-5 2.15V5h10z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-8">
        <DocumentWithChat
          books={livres as LawBook[]}
          isSearchOpen={isSearchOpen}
          onSearchOpenChange={setIsSearchOpen}
          isBookmarksOpen={isBookmarksOpen}
          onBookmarksOpenChange={setIsBookmarksOpen}
        />
      </div>
    </main>
  );
}

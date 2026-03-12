 "use client";

import { useState } from "react";
import type { LawSource } from "@/lib/law/types";
import DocumentWithChat from "@/components/DocumentWithChat";
import { lawSources } from "./data/libraryCatalog";

type ToolbarTool = "assistant" | "bookmarks" | "none";

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Side tools are opt-in and only shown when selected.
  const [activeTool, setActiveTool] = useState<ToolbarTool>("none");
  // Incrementing this value tells the document viewer to return to the
  // "Livres" root stage on the right side (single source of book selection).
  const [booksHomeSignal, setBooksHomeSignal] = useState(0);

  return (
    <main className="flex h-screen flex-col bg-white font-sans text-zinc-900">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 md:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            SafeLink
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Naviguez entre les corpus reglementaires (ERP, APSAD, EN/NF) et
            interrogez l&apos;assistant pour retrouver rapidement les references
            utiles.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-8">
        <div className="flex h-full gap-4">
          <aside className="flex w-14 shrink-0 flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 py-3">
            {/* Bibliotheque tool: reset right viewer to its root stage */}
            <button
              type="button"
              onClick={() => {
                // No duplicate left panel: this action only affects the right viewer.
                setActiveTool("none");
                setBooksHomeSignal((prev) => prev + 1);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Afficher la bibliotheque"
              title="Bibliotheque"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M4 5a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v11.5a.5.5 0 0 1-.8.4A4.5 4.5 0 0 0 16.5 17H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10.5A5.5 5.5 0 0 1 19 16.6V6a2 2 0 0 0-2-2z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Search tool */}
            <button
              type="button"
              onClick={() => {
                // Search remains a modal and closes any active side section.
                setActiveTool("none");
                setIsSearchOpen(true);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Ouvrir la recherche"
              title="Recherche"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L19 20.5 20.5 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Bookmark tool */}
            <button
              type="button"
              onClick={() =>
                setActiveTool((prev) =>
                  prev === "bookmarks" ? "none" : "bookmarks",
                )
              }
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-md transition",
                activeTool === "bookmarks"
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              ].join(" ")}
              aria-label="Afficher ou masquer les signets"
              title="Signets"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15.11-5-2.15-5 2.15V5h10z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Assistant tool toggles the panel on/off */}
            <button
              type="button"
              onClick={() =>
                setActiveTool((prev) => (prev === "assistant" ? "none" : "assistant"))
              }
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-md transition",
                activeTool === "assistant"
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              ].join(" ")}
              aria-label="Afficher ou masquer l'assistant"
              title="Assistant"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.5 4v-4.5A2.5 2.5 0 0 1 4 13.5z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </aside>

          <div className="min-w-0 flex-1">
            <DocumentWithChat
              sources={lawSources as LawSource[]}
              isSearchOpen={isSearchOpen}
              onSearchOpenChange={setIsSearchOpen}
              booksHomeSignal={booksHomeSignal}
              isAssistantOpen={activeTool === "assistant"}
              isBookmarksPanelOpen={activeTool === "bookmarks"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

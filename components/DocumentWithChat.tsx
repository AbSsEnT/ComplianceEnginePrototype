"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LawNode,
  LawReference,
  LawSource,
  BookmarkEntry,
  RecentBookVisit,
} from "@/lib/law/types";
import LawViewer from "./LawViewer";
import { Bookmark, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";

interface DocumentWithChatProps {
  sources: LawSource[];
  booksHomeSignal?: number;
  isBookmarksPanelOpen?: boolean;
  bookmarks: BookmarkEntry[];
  onBookmarksChange: (bookmarks: BookmarkEntry[]) => void;
  onBookVisited?: (visit: RecentBookVisit) => void;
  /** When set, the viewer navigates to this article/paragraph on mount or change. */
  navTarget?: { articleId: string; paragraphId?: string; _signal: number } | null;
}

type IndexEntry = {
  sourceId: string;
  bookId: string;
  chapterId?: string;
};

type Index = Record<string, IndexEntry>;

const SIDE_PANEL_WIDTH = 580;
const panelTransition = { type: "spring" as const, stiffness: 350, damping: 32 };

export default function DocumentWithChat({
  sources,
  booksHomeSignal = 0,
  isBookmarksPanelOpen = false,
  bookmarks,
  onBookmarksChange,
  onBookVisited,
  navTarget = null,
}: DocumentWithChatProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const bookIndex = useMemo(() => buildIndex(sources), [sources]);

  const navigateTo = useCallback(
    (ref: { articleId: string; paragraphId?: string }) => {
      const targetId = ref.paragraphId ?? ref.articleId;
      if (!targetId) return;

      const path = bookIndex[targetId];
      if (!path) return;

      setSelectedSourceId(path.sourceId);
      setSelectedBookId(path.bookId);
      setSelectedChapterId(path.chapterId ?? null);
      setTimeout(() => setScrollTargetId(targetId), 0);
    },
    [bookIndex],
  );

  useEffect(() => {
    setSelectedSourceId(null);
    setSelectedBookId(null);
    setSelectedChapterId(null);
    setScrollTargetId(null);
  }, [booksHomeSignal]);

  // Deep-link from search results (or any external navigation).
  // Declared after booksHomeSignal reset so its state updates take precedence on mount.
  useEffect(() => {
    if (navTarget) {
      navigateTo(navTarget);
    }
  }, [navTarget, navigateTo]);

  const handleSelectBook = useCallback(
    (bookId: string) => {
      setSelectedBookId(bookId);
      setSelectedChapterId(null);
      setScrollTargetId(null);

      if (onBookVisited && selectedSourceId) {
        const source = sources.find((s) => s.id === selectedSourceId);
        const book = source?.books.find((b) => b.id === bookId);
        if (source && book) {
          onBookVisited({
            sourceId: source.id,
            sourceLabel: source.label,
            bookId: book.id,
            bookLabel: book.label,
            heading: book.heading,
            visitedAt: Date.now(),
          });
        }
      }
    },
    [onBookVisited, selectedSourceId, sources],
  );

  const getBookmarkKey = (ref: { articleId: string; paragraphId?: string }) =>
    `${ref.articleId}#${ref.paragraphId ?? ""}`;

  const isBookmarked = (ref: { articleId: string; paragraphId?: string }) => {
    const key = getBookmarkKey(ref);
    return bookmarks.some((b) => b.key === key);
  };

  const handleToggleBookmark = (
    ref: { articleId: string; paragraphId?: string },
    meta: { title: string; excerpt: string },
  ) => {
    const targetId = ref.paragraphId ?? ref.articleId;
    if (!targetId) return;

    const path = bookIndex[targetId];
    if (!path) return;

    const key = getBookmarkKey(ref);
    const exists = bookmarks.some((b) => b.key === key);
    if (exists) {
      onBookmarksChange(bookmarks.filter((b) => b.key !== key));
    } else {
      const entry: BookmarkEntry = {
        key,
        articleId: ref.articleId,
        paragraphId: ref.paragraphId,
        sourceId: path.sourceId,
        bookId: path.bookId,
        chapterId: path.chapterId ?? "",
        title: meta.title,
        excerpt: meta.excerpt,
        createdAt: Date.now(),
      };
      onBookmarksChange([entry, ...bookmarks]);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* ── Animated bookmarks side panel ── */}
      <AnimatePresence initial={false}>
        {isBookmarksPanelOpen && (
          <motion.div
            key="bookmarks"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDE_PANEL_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={panelTransition}
            className="shrink-0 overflow-hidden"
          >
            <div className="h-full" style={{ width: SIDE_PANEL_WIDTH }}>
              <section className="flex h-full flex-col rounded-xl bg-card ring-1 ring-border">
                <header className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                      <Bookmark className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Signets enregistrés
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Retrouvez ici vos passages importants.
                      </p>
                    </div>
                  </div>
                </header>

                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-2 text-sm">
                    {bookmarks.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                          <Bookmark className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Aucun signet pour le moment.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Utilisez l&apos;icône signet dans les articles pour en
                          ajouter.
                        </p>
                      </div>
                    )}
                    {bookmarks.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => {
                          navigateTo({
                            articleId: b.articleId,
                            paragraphId: b.paragraphId,
                          });
                        }}
                        className="group w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-foreground">
                            {b.title}
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookmarksChange(
                                bookmarks.filter(
                                  (entry) => entry.key !== b.key,
                                ),
                              );
                            }}
                            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </span>
                        </div>
                        <div className="line-clamp-3 text-sm text-muted-foreground">
                          {b.excerpt}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Law viewer ── */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <LawViewer
          sources={sources}
          selectedSourceId={selectedSourceId}
          selectedBookId={selectedBookId}
          selectedChapterId={selectedChapterId}
          onSelectSource={(id) => {
            setSelectedSourceId(id);
            setSelectedBookId(null);
            setSelectedChapterId(null);
            setScrollTargetId(null);
          }}
          onClearSource={() => {
            setSelectedSourceId(null);
            setSelectedBookId(null);
            setSelectedChapterId(null);
            setScrollTargetId(null);
          }}
          onSelectBook={handleSelectBook}
          onClearBook={() => {
            setSelectedBookId(null);
            setSelectedChapterId(null);
            setScrollTargetId(null);
          }}
          onSelectChapter={(id) => {
            setSelectedChapterId(id);
            setScrollTargetId(null);
          }}
          scrollTargetId={scrollTargetId}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmark}
        />
      </div>
    </div>
  );
}

/* ── Utility: build node-to-path index ── */

function buildIndex(sources: LawSource[]): Index {
  const index: Index = {};
  for (const source of sources) {
    for (const book of source.books) {
      const bookId = book.id;
      const chapters = book.children?.filter((n) => n.kind === "chapter") ?? [];
      for (const chapter of chapters) {
        const chapterId = chapter.id;
        const walk = (nodes: LawNode[] | undefined) => {
          if (!nodes) return;
          for (const node of nodes) {
            if (node.kind === "article" || node.kind === "paragraph") {
              index[node.id] = { sourceId: source.id, bookId, chapterId };
            }
            if (node.children) walk(node.children);
          }
        };
        walk(chapter.children);
      }
    }
  }
  return index;
}

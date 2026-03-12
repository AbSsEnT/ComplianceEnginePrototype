"use client";

import { useEffect, useMemo, useState } from "react";
import type { LawBook, LawNode, LawReference, LawSource } from "@/lib/law/types";
import ChatPanel from "./ChatPanel";
import LawViewer from "./LawViewer";

interface DocumentWithChatProps {
  sources: LawSource[];
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  booksHomeSignal?: number;
  isAssistantOpen?: boolean;
  isBookmarksPanelOpen?: boolean;
}

type IndexEntry = {
  sourceId: string;
  bookId: string;
  chapterId?: string;
};

type Index = Record<string, IndexEntry>;

type LawSearchResult = {
  id: string;
  sourceId: string;
  bookId: string;
  chapterId: string;
  articleId: string;
  paragraphId?: string;
  sourceLabel: string;
  bookLabel: string;
  chapterLabel: string;
  articleLabel: string;
  paragraphLabel?: string;
  snippet: string;
};

type Bookmark = {
  key: string;
  articleId: string;
  paragraphId?: string;
  sourceId: string;
  bookId: string;
  chapterId: string;
  title: string;
  excerpt: string;
  createdAt: number;
};

export default function DocumentWithChat({
  sources,
  isSearchOpen: controlledSearchOpen,
  onSearchOpenChange,
  booksHomeSignal = 0,
  isAssistantOpen = true,
  isBookmarksPanelOpen = false,
}: DocumentWithChatProps) {
  // Source -> Book -> Chapter navigation state.
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [uncontrolledSearchOpen, setUncontrolledSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LawSearchResult[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const bookIndex = useMemo(() => buildIndex(sources), [sources]);

  const isSearchOpen = controlledSearchOpen ?? uncontrolledSearchOpen;
  const setIsSearchOpen = onSearchOpenChange ?? setUncontrolledSearchOpen;
  // A side panel is shown only for tools that truly need one.
  const isSidePanelOpen = isAssistantOpen || isBookmarksPanelOpen;

  // Reset to library root when the user clicks the toolbar's "Bibliotheque" tool.
  useEffect(() => {
    setSelectedSourceId(null);
    setSelectedBookId(null);
    setSelectedChapterId(null);
    setScrollTargetId(null);
  }, [booksHomeSignal]);

  const navigateTo = (ref: { articleId: string; paragraphId?: string }) => {
    const targetId = ref.paragraphId ?? ref.articleId;
    if (!targetId) return;

    const path = bookIndex[targetId];
    if (!path) return;

    setSelectedSourceId(path.sourceId);
    setSelectedBookId(path.bookId);
    setSelectedChapterId(path.chapterId ?? null);
    // Defer scroll target slightly so chapter content re-renders first.
    setTimeout(() => setScrollTargetId(targetId), 0);
  };

  const handleReferenceClick = (ref: LawReference) => {
    navigateTo(ref);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const results = searchBooks(sources, trimmed);
    setSearchResults(results);
  };

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
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.key === key);
      if (exists) {
        return prev.filter((b) => b.key !== key);
      }
      const entry: Bookmark = {
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
      return [entry, ...prev];
    });
  };

  return (
    <div
      className={[
        "grid h-full gap-6",
        // The left column is reserved for an active side tool.
        isSidePanelOpen ? "grid-cols-[580px_1fr]" : "grid-cols-1",
      ].join(" ")}
    >
      {/* Side panel content switches with the selected toolbar tool. */}
      {isAssistantOpen && (
        <div className="flex h-full flex-col overflow-hidden">
          <ChatPanel onReferenceClick={handleReferenceClick} />
        </div>
      )}
      {isBookmarksPanelOpen && (
        <section className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white">
          <header className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Signets enregistres
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Retrouvez ici tous vos signets pour revenir rapidement sur les
              passages importants.
            </p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {bookmarks.length === 0 && (
              <p className="text-sm text-zinc-500">
                Aucun signet pour le moment. Ajoutez-en avec l&apos;icone 🔖
                visible dans la lecture d&apos;article.
              </p>
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
                className="group w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm transition hover:border-zinc-400 hover:bg-white"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-800">
                    {b.title}
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookmarks((prev) =>
                        prev.filter((entry) => entry.key !== b.key),
                      );
                    }}
                    className="cursor-pointer rounded-full px-3 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  >
                    Supprimer
                  </span>
                </div>
                <div className="line-clamp-3 text-sm text-zinc-700">
                  {b.excerpt}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Law viewer always stays available and expands if no tool panel is open. */}
      <div className="h-full overflow-hidden">
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
          onSelectBook={(id) => {
            setSelectedBookId(id);
            setSelectedChapterId(null);
            setScrollTargetId(null);
          }}
          onClearBook={() => {
            // Going back from a book keeps the selected source visible.
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

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-800">
                Recherche dans les corpus
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="rounded-md px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              >
                Fermer
              </button>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un article ou un paragraphe..."
              className="mb-4 w-full rounded-md border border-zinc-300 px-4 py-3 text-base shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <div className="max-h-128 space-y-3 overflow-y-auto text-sm">
              {!searchQuery.trim() && (
                <p className="text-sm text-zinc-500">
                  Saisissez un terme pour rechercher dans tous les corpus.
                </p>
              )}
              {searchQuery.trim() && searchResults.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Aucun resultat pour « {searchQuery} ».
                </p>
              )}
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    navigateTo({
                      articleId: res.articleId,
                      paragraphId: res.paragraphId,
                    });
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm transition hover:border-zinc-400 hover:bg-white"
                >
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
                    {res.sourceLabel} · {res.bookLabel} · {res.chapterLabel}
                  </div>
                  <div className="text-sm font-semibold text-zinc-800">
                    {res.articleLabel}
                    {res.paragraphLabel ? ` – ${res.paragraphLabel}` : null}
                  </div>
                  <div
                    className="mt-1 line-clamp-3 text-sm text-zinc-700"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: res.snippet }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildIndex(sources: LawSource[]): Index {
  const index: Index = {};

  for (const source of sources) {
    for (const book of source.books) {
      const bookId = book.id;
      const chapters = book.children?.filter((n) => n.kind === "chapter") ?? [];

      for (const chapter of chapters) {
        const chapterId = chapter.id;
        const sections =
          chapter.children?.filter((n) => n.kind === "section") ?? [];
        const directArticles =
          chapter.children?.filter((n) => n.kind === "article") ?? [];

        for (const article of directArticles) {
          index[article.id] = { sourceId: source.id, bookId, chapterId };
          const paragraphs =
            article.children?.filter((n) => n.kind === "paragraph") ?? [];
          for (const para of paragraphs) {
            index[para.id] = { sourceId: source.id, bookId, chapterId };
          }
        }

        for (const section of sections) {
          const articles =
            section.children?.filter((n) => n.kind === "article") ?? [];
          for (const article of articles) {
            index[article.id] = { sourceId: source.id, bookId, chapterId };
            const paragraphs =
              article.children?.filter((n) => n.kind === "paragraph") ?? [];
            for (const para of paragraphs) {
              index[para.id] = { sourceId: source.id, bookId, chapterId };
            }
          }
        }
      }
    }
  }

  return index;
}

function searchBooks(sources: LawSource[], query: string): LawSearchResult[] {
  const q = query.toLowerCase();
  const results: LawSearchResult[] = [];

  const pushResult = (args: {
    source: LawSource;
    book: LawBook;
    chapter: LawNode;
    article: LawNode;
    paragraph?: LawNode;
    sourceText: string;
  }) => {
    if (results.length >= 5) return;
    const { source, book, chapter, article, paragraph, sourceText } = args;
    const lower = sourceText.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return;
    const start = Math.max(0, idx - 40);
    const end = Math.min(sourceText.length, idx + query.length + 40);
    const before = sourceText.slice(start, idx);
    const match = sourceText.slice(idx, idx + query.length);
    const after = sourceText.slice(idx + query.length, end);
    const snippet = `${start > 0 ? "…" : ""}${before}<mark>${match}</mark>${after}${
      end < sourceText.length ? "…" : ""
    }`;

    results.push({
      id: paragraph?.id ?? article.id,
      sourceId: source.id,
      bookId: book.id,
      chapterId: chapter.id,
      articleId: article.id,
      paragraphId: paragraph?.id,
      sourceLabel: source.label,
      bookLabel: book.label,
      chapterLabel: chapter.label,
      articleLabel: article.label,
      paragraphLabel: paragraph?.label,
      snippet,
    });
  };

  for (const source of sources) {
    for (const book of source.books) {
      const chapters = book.children?.filter((n) => n.kind === "chapter") ?? [];
      for (const chapter of chapters) {
        const sections =
          chapter.children?.filter((n) => n.kind === "section") ?? [];
        const directArticles =
          chapter.children?.filter((n) => n.kind === "article") ?? [];

        for (const article of directArticles) {
          const articleText = [article.label, article.heading, article.content]
            .filter(Boolean)
            .join(" — ");
          if (articleText.toLowerCase().includes(q)) {
            pushResult({
              source,
              book,
              chapter,
              article,
              sourceText: articleText,
            });
            if (results.length >= 5) return results;
          }
          const paragraphs =
            article.children?.filter((n) => n.kind === "paragraph") ?? [];
          for (const para of paragraphs) {
            const paraText = [para.label, para.content].filter(Boolean).join(" — ");
            if (!paraText.toLowerCase().includes(q)) continue;
            pushResult({
              source,
              book,
              chapter,
              article,
              paragraph: para,
              sourceText: paraText,
            });
            if (results.length >= 5) return results;
          }
        }

        for (const section of sections) {
          const articles =
            section.children?.filter((n) => n.kind === "article") ?? [];
          for (const article of articles) {
            const articleText = [article.label, article.heading, article.content]
              .filter(Boolean)
              .join(" — ");
            if (articleText.toLowerCase().includes(q)) {
              pushResult({
                source,
                book,
                chapter,
                article,
                sourceText: articleText,
              });
              if (results.length >= 5) return results;
            }
            const paragraphs =
              article.children?.filter((n) => n.kind === "paragraph") ?? [];
            for (const para of paragraphs) {
              const paraText = [para.label, para.content]
                .filter(Boolean)
                .join(" — ");
              if (!paraText.toLowerCase().includes(q)) continue;
              pushResult({
                source,
                book,
                chapter,
                article,
                paragraph: para,
                sourceText: paraText,
              });
              if (results.length >= 5) return results;
            }
          }
        }
      }
      if (results.length >= 5) break;
    }
    if (results.length >= 5) break;
  }

  return results;
}


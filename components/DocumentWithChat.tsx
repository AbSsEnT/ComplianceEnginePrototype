"use client";

import { useMemo, useState } from "react";
import type { LawBook, LawNode, LawReference } from "@/lib/law/types";
import ChatPanel from "./ChatPanel";
import LawViewer from "./LawViewer";

interface DocumentWithChatProps {
  books: LawBook[];
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  isBookmarksOpen?: boolean;
  onBookmarksOpenChange?: (open: boolean) => void;
}

type IndexEntry = {
  bookId: string;
  chapterId?: string;
};

type Index = Record<string, IndexEntry>;

type LawSearchResult = {
  id: string;
  bookId: string;
  chapterId: string;
  articleId: string;
  paragraphId?: string;
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
  bookId: string;
  chapterId: string;
  title: string;
  excerpt: string;
  createdAt: number;
};

export default function DocumentWithChat({
  books,
  isSearchOpen: controlledSearchOpen,
  onSearchOpenChange,
  isBookmarksOpen: controlledBookmarksOpen,
  onBookmarksOpenChange,
}: DocumentWithChatProps) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [uncontrolledSearchOpen, setUncontrolledSearchOpen] = useState(false);
  const [uncontrolledBookmarksOpen, setUncontrolledBookmarksOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LawSearchResult[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const bookIndex = useMemo(() => buildIndex(books), [books]);

  const isSearchOpen =
    controlledSearchOpen ?? uncontrolledSearchOpen;
  const setIsSearchOpen =
    onSearchOpenChange ?? setUncontrolledSearchOpen;

  const isBookmarksOpen =
    controlledBookmarksOpen ?? uncontrolledBookmarksOpen;
  const setIsBookmarksOpen =
    onBookmarksOpenChange ?? setUncontrolledBookmarksOpen;

  const navigateTo = (ref: { articleId: string; paragraphId?: string }) => {
    const targetId = ref.paragraphId ?? ref.articleId;
    if (!targetId) return;

    const path = bookIndex[targetId];
    if (!path) return;

    setSelectedBookId(path.bookId);
    setSelectedChapterId(path.chapterId ?? null);
    // Defer scroll target slightly so chapter content re-renders first
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
    const results = searchBooks(books, trimmed);
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
    <div className="grid h-full grid-cols-[580px_1fr] gap-6">
      {/* Chat column */}
      <div className="flex h-full flex-col overflow-hidden">
        <ChatPanel onReferenceClick={handleReferenceClick} />
      </div>

      {/* Law viewer column — 1fr guarantees it fills all remaining space */}
      <div className="h-full overflow-hidden">
        <LawViewer
          books={books}
          selectedBookId={selectedBookId}
          selectedChapterId={selectedChapterId}
          onSelectBook={(id) => {
            setSelectedBookId(id);
            setSelectedChapterId(null);
            setScrollTargetId(null);
          }}
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

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-800">
                Recherche dans les livres
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
                  Saisissez un terme pour rechercher dans tous les livres.
                </p>
              )}
              {searchQuery.trim() && searchResults.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Aucun résultat pour « {searchQuery} ».
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
                    {res.bookLabel} · {res.chapterLabel}
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

      {isBookmarksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-800">
                Signets enregistrés
              </h2>
              <button
                type="button"
                onClick={() => setIsBookmarksOpen(false)}
                className="rounded-md px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              >
                Fermer
              </button>
            </div>
            <div className="max-h-128 space-y-3 overflow-y-auto text-sm">
              {bookmarks.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Aucun signet pour le moment. Ajoutez-en en cliquant sur
                  l&apos;icône 🔖 en haut à droite d&apos;un article ou d&apos;un
                  paragraphe.
                </p>
              )}
              {bookmarks.slice(0, 5).map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => {
                    navigateTo({
                      articleId: b.articleId,
                      paragraphId: b.paragraphId,
                    });
                    setIsBookmarksOpen(false);
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
          </div>
        </div>
      )}
    </div>
  );
}

function buildIndex(books: LawBook[]): Index {
  const index: Index = {};

  for (const book of books) {
    const bookId = book.id;
    const chapters = book.children?.filter((n) => n.kind === "chapter") ?? [];

    for (const chapter of chapters) {
      const chapterId = chapter.id;
      const sections =
        chapter.children?.filter((n) => n.kind === "section") ?? [];
      const directArticles =
        chapter.children?.filter((n) => n.kind === "article") ?? [];

      for (const article of directArticles) {
        index[article.id] = { bookId, chapterId };
        const paragraphs =
          article.children?.filter((n) => n.kind === "paragraph") ?? [];
        for (const para of paragraphs) {
          index[para.id] = { bookId, chapterId };
        }
      }

      for (const section of sections) {
        const articles =
          section.children?.filter((n) => n.kind === "article") ?? [];
        for (const article of articles) {
          index[article.id] = { bookId, chapterId };
          const paragraphs =
            article.children?.filter((n) => n.kind === "paragraph") ?? [];
          for (const para of paragraphs) {
            index[para.id] = { bookId, chapterId };
          }
        }
      }
    }
  }

  return index;
}

function searchBooks(books: LawBook[], query: string): LawSearchResult[] {
  const q = query.toLowerCase();
  const results: LawSearchResult[] = [];

  const pushResult = (args: {
    book: LawBook;
    chapter: LawNode;
    article: LawNode;
    paragraph?: LawNode;
    sourceText: string;
  }) => {
    if (results.length >= 5) return;
    const { book, chapter, article, paragraph, sourceText } = args;
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
      bookId: book.id,
      chapterId: chapter.id,
      articleId: article.id,
      paragraphId: paragraph?.id,
      bookLabel: book.label,
      chapterLabel: chapter.label,
      articleLabel: article.label,
      paragraphLabel: paragraph?.label,
      snippet,
    });
  };

  for (const book of books) {
    const chapters =
      book.children?.filter((n) => n.kind === "chapter") ?? [];
    for (const chapter of chapters) {
      const sections =
        chapter.children?.filter((n) => n.kind === "section") ?? [];
      const directArticles =
        chapter.children?.filter((n) => n.kind === "article") ?? [];

      // Direct articles
      for (const article of directArticles) {
        const articleText = [
          article.label,
          article.heading,
          article.content,
        ]
          .filter(Boolean)
          .join(" — ");
        if (articleText.toLowerCase().includes(q)) {
          pushResult({
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
            book,
            chapter,
            article,
            paragraph: para,
            sourceText: paraText,
          });
          if (results.length >= 5) return results;
        }
      }

      // Sections and their articles
      for (const section of sections) {
        const articles =
          section.children?.filter((n) => n.kind === "article") ?? [];
        for (const article of articles) {
          const articleText = [
            article.label,
            article.heading,
            article.content,
          ]
            .filter(Boolean)
            .join(" — ");
          if (articleText.toLowerCase().includes(q)) {
            pushResult({
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

  return results;
}


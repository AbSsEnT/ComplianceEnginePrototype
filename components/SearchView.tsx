"use client";

/**
 * SearchView — dedicated full-screen search page with advanced filter options.
 *
 * Layout:
 *  - Top bar: large search input
 *  - Two-column body:
 *    - Left sidebar (~280px): source/book filter checkboxes
 *    - Right main area: scrollable search results
 *
 * Clicking a result fires `onNavigateToResult` so the parent can switch to
 * the document viewer and scroll to the target article/paragraph.
 */

import { useCallback, useMemo, useState } from "react";
import type { LawBook, LawNode, LawSource } from "@/lib/law/types";
import {
  Search,
  FileText,
  SlidersHorizontal,
  BookOpen,
  ChevronDown,
  ChevronRight,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ── Public types ── */

export type SearchResult = {
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

interface SearchViewProps {
  sources: LawSource[];
  /** Called when the user clicks a search result to navigate to it. */
  onNavigateToResult: (result: SearchResult) => void;
}

const MAX_RESULTS = 50;

export default function SearchView({
  sources,
  onNavigateToResult,
}: SearchViewProps) {
  const [query, setQuery] = useState("");

  // Filter state: which source+book pairs are active.
  // By default everything is selected.
  const allBookKeys = useMemo(
    () =>
      sources.flatMap((s) =>
        s.books.map((b) => bookKey(s.id, b.id)),
      ),
    [sources],
  );
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(
    () => new Set(allBookKeys),
  );

  // Track which source groups are collapsed in the filter sidebar
  const [collapsedSources, setCollapsedSources] = useState<Set<string>>(
    () => new Set(),
  );

  // Derive which sources to actually search
  const filteredSources = useMemo(() => {
    return sources
      .map((source) => ({
        ...source,
        books: source.books.filter((b) =>
          selectedBooks.has(bookKey(source.id, b.id)),
        ),
      }))
      .filter((s) => s.books.length > 0);
  }, [sources, selectedBooks]);

  // Run the search whenever query or filters change
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchBooks(filteredSources, trimmed, MAX_RESULTS);
  }, [query, filteredSources]);

  // Filter helpers
  const toggleBook = useCallback((key: string) => {
    setSelectedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSource = useCallback(
    (sourceId: string) => {
      const source = sources.find((s) => s.id === sourceId);
      if (!source) return;
      const keys = source.books.map((b) => bookKey(sourceId, b.id));
      setSelectedBooks((prev) => {
        const allSelected = keys.every((k) => prev.has(k));
        const next = new Set(prev);
        if (allSelected) {
          keys.forEach((k) => next.delete(k));
        } else {
          keys.forEach((k) => next.add(k));
        }
        return next;
      });
    },
    [sources],
  );

  const selectAll = useCallback(() => {
    setSelectedBooks(new Set(allBookKeys));
  }, [allBookKeys]);

  const selectNone = useCallback(() => {
    setSelectedBooks(new Set());
  }, []);

  const toggleCollapseSource = useCallback((sourceId: string) => {
    setCollapsedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const activeFilterCount = allBookKeys.length - selectedBooks.size;

  return (
    <div className="flex h-full flex-col">
      {/* ── Search header ── */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans les corpus réglementaires..."
              autoFocus
              className="h-14 w-full rounded-xl border border-input bg-background pl-12 pr-12 text-base outline-none transition placeholder:text-muted-foreground focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Quick stats bar */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {query.trim() ? (
              <span>
                {results.length === MAX_RESULTS
                  ? `${MAX_RESULTS}+ résultats`
                  : `${results.length} résultat${results.length !== 1 ? "s" : ""}`}
                {activeFilterCount > 0 && (
                  <> · {activeFilterCount} filtre{activeFilterCount !== 1 ? "s" : ""} actif{activeFilterCount !== 1 ? "s" : ""}</>
                )}
              </span>
            ) : (
              <span>
                Saisissez un terme pour lancer la recherche.
                <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  Ctrl+K
                </kbd>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: filters + results ── */}
      <div className="flex min-h-0 flex-1">
        {/* Filter sidebar */}
        <aside className="w-72 shrink-0 border-r border-border bg-card">
          <ScrollArea className="h-full">
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtres
                </h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Tout
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Aucun
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {sources.map((source) => {
                  const sourceBookKeys = source.books.map((b) =>
                    bookKey(source.id, b.id),
                  );
                  const allChecked = sourceBookKeys.every((k) =>
                    selectedBooks.has(k),
                  );
                  const someChecked =
                    !allChecked &&
                    sourceBookKeys.some((k) => selectedBooks.has(k));
                  const isCollapsed = collapsedSources.has(source.id);

                  return (
                    <div key={source.id}>
                      {/* Source header */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleCollapseSource(source.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-muted"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSource(source.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1.5 text-left transition hover:bg-muted"
                        >
                          <FilterCheckbox
                            checked={allChecked}
                            indeterminate={someChecked}
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {source.label}
                          </span>
                        </button>
                      </div>

                      {/* Individual books within the source */}
                      {!isCollapsed && (
                        <div className="ml-6 space-y-0.5 pb-1">
                          {source.books.map((bk) => {
                            const key = bookKey(source.id, bk.id);
                            const checked = selectedBooks.has(key);
                            return (
                              <button
                                key={bk.id}
                                type="button"
                                onClick={() => toggleBook(key)}
                                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition hover:bg-muted"
                              >
                                <FilterCheckbox checked={checked} />
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-sm text-foreground">
                                    {bk.label}
                                  </span>
                                  {bk.heading && (
                                    <span className="block truncate text-[11px] text-muted-foreground">
                                      {bk.heading}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Results area */}
        <div className="min-w-0 flex-1">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-4xl px-6 py-4">
              {/* Empty / initial states */}
              {!query.trim() && (
                <EmptyState
                  icon={<Search className="h-8 w-8 text-slate-300" />}
                  title="Recherche avancée"
                  subtitle="Saisissez un terme ci-dessus pour rechercher dans les articles et paragraphes. Utilisez les filtres à gauche pour affiner les résultats par source et par livre."
                />
              )}

              {query.trim() && results.length === 0 && (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-slate-300" />}
                  title={`Aucun résultat pour « ${query} »`}
                  subtitle={
                    activeFilterCount > 0
                      ? "Essayez d'élargir vos filtres ou de modifier votre recherche."
                      : "Essayez un autre terme ou vérifiez l'orthographe."
                  }
                />
              )}

              {/* Result list */}
              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => onNavigateToResult(res)}
                      className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Breadcrumb */}
                        <div className="mb-1 flex flex-wrap items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {res.sourceLabel}
                          </Badge>
                          <span>·</span>
                          <span>{res.bookLabel}</span>
                          <span>·</span>
                          <span>{res.chapterLabel}</span>
                        </div>

                        {/* Article title */}
                        <div className="text-sm font-semibold text-foreground">
                          {res.articleLabel}
                          {res.paragraphLabel && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              — {res.paragraphLabel}
                            </span>
                          )}
                        </div>

                        {/* Snippet with highlighted matches */}
                        <div
                          className="mt-1 line-clamp-2 text-sm text-muted-foreground [&_mark]:rounded [&_mark]:bg-blue-100 [&_mark]:px-0.5 [&_mark]:font-medium [&_mark]:text-blue-800"
                          dangerouslySetInnerHTML={{ __html: res.snippet }}
                        />
                      </div>

                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}

                  {results.length === MAX_RESULTS && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Résultats limités à {MAX_RESULTS}. Affinez votre recherche
                      ou vos filtres pour des résultats plus ciblés.
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function FilterCheckbox({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  if (indeterminate) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-blue-600 bg-blue-600/20">
        <div className="h-0.5 w-2 rounded-full bg-blue-600" />
      </div>
    );
  }
  if (checked) {
    return <CheckSquare className="h-4 w-4 shrink-0 text-blue-600" />;
  }
  return <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function bookKey(sourceId: string, bookId: string) {
  return `${sourceId}::${bookId}`;
}

/**
 * Full-text search across filtered sources.
 * Matches article/paragraph text and returns up to `limit` results with
 * HTML-highlighted snippets.
 */
function searchBooks(
  sources: LawSource[],
  query: string,
  limit: number,
): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  const pushResult = (args: {
    source: LawSource;
    book: LawBook;
    chapter: LawNode;
    article: LawNode;
    paragraph?: LawNode;
    sourceText: string;
  }) => {
    if (results.length >= limit) return;
    const { source, book, chapter, article, paragraph, sourceText } = args;
    const lower = sourceText.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return;
    const start = Math.max(0, idx - 60);
    const end = Math.min(sourceText.length, idx + query.length + 60);
    const before = escapeHtml(sourceText.slice(start, idx));
    const match = escapeHtml(sourceText.slice(idx, idx + query.length));
    const after = escapeHtml(sourceText.slice(idx + query.length, end));
    const snippet = `${start > 0 ? "…" : ""}${before}<mark>${match}</mark>${after}${end < sourceText.length ? "…" : ""}`;

    results.push({
      id: `${article.id}-${paragraph?.id ?? ""}`,
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
      for (
        const chapter of book.children?.filter(
          (n) => n.kind === "chapter",
        ) ?? []
      ) {
        const walk = (nodes: LawNode[] | undefined, article?: LawNode) => {
          if (!nodes || results.length >= limit) return;
          for (const node of nodes) {
            if (results.length >= limit) return;

            if (node.kind === "article") {
              const text = [node.label, node.heading, node.content]
                .filter(Boolean)
                .join(" — ");
              if (text.toLowerCase().includes(q)) {
                pushResult({
                  source,
                  book,
                  chapter,
                  article: node,
                  sourceText: text,
                });
              }
              walk(node.children, node);
            } else if (node.kind === "paragraph" && article) {
              const text = [node.label, node.content]
                .filter(Boolean)
                .join(" — ");
              if (text.toLowerCase().includes(q)) {
                pushResult({
                  source,
                  book,
                  chapter,
                  article,
                  paragraph: node,
                  sourceText: text,
                });
              }
            } else if (node.kind === "section") {
              walk(node.children);
            }
          }
        };
        walk(chapter.children);
      }
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return results;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

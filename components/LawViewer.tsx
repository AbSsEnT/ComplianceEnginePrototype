"use client";

import type { LawBook, LawNode, LawSource } from "@/lib/law/types";
import ChapterContent from "./ChapterContent";
import { ChevronRight, BookOpen, FileText, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LawViewerProps {
  sources: LawSource[];
  selectedSourceId: string | null;
  selectedBookId: string | null;
  selectedChapterId: string | null;
  scrollTargetId?: string | null;
  onSelectSource: (id: string) => void;
  onClearSource: () => void;
  onSelectBook: (id: string) => void;
  onClearBook: () => void;
  onSelectChapter: (id: string) => void;
  isBookmarked?: (ref: { articleId: string; paragraphId?: string }) => boolean;
  onToggleBookmark?: (
    ref: { articleId: string; paragraphId?: string },
    meta: { title: string; excerpt: string },
  ) => void;
}

export default function LawViewer({
  sources,
  selectedSourceId,
  selectedBookId,
  selectedChapterId,
  scrollTargetId,
  onSelectSource,
  onClearSource,
  onSelectBook,
  onClearBook,
  onSelectChapter,
  isBookmarked,
  onToggleBookmark,
}: LawViewerProps) {
  const selectedSource: LawSource | null =
    sources.find((s) => s.id === selectedSourceId) ?? null;
  const books: LawBook[] = selectedSource?.books ?? [];

  const selectedBook: LawBook | null =
    books.find((b) => b.id === selectedBookId) ?? null;

  const chapters: LawNode[] =
    selectedBook?.children?.filter((c) => c.kind === "chapter") ?? [];

  const selectedChapter: LawNode | null =
    chapters.find((c) => c.id === selectedChapterId) ?? null;

  return (
    <div className="flex h-full flex-col rounded-xl bg-card ring-1 ring-border">
      {/* Breadcrumb navigation */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-5 py-3 text-sm">
        {selectedSource ? (
          <button
            type="button"
            onClick={onClearSource}
            className="text-blue-600 transition hover:text-blue-800"
          >
            Bibliothèque
          </button>
        ) : (
          <span className="font-medium text-foreground">Bibliothèque</span>
        )}

        {selectedSource && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {selectedBook ? (
              <button
                type="button"
                onClick={onClearBook}
                className="text-blue-600 transition hover:text-blue-800"
              >
                {selectedSource.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">
                {selectedSource.label}
              </span>
            )}
          </>
        )}

        {selectedBook && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {selectedChapter ? (
              <button
                type="button"
                onClick={() => onSelectBook(selectedBook.id)}
                className="text-blue-600 transition hover:text-blue-800"
              >
                {selectedBook.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">
                {selectedBook.label}
              </span>
            )}
          </>
        )}

        {selectedChapter && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-foreground">
              {selectedChapter.label}
            </span>
          </>
        )}
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-hidden">
        {/* Stage 1 – Source tiles */}
        {!selectedSource && (
          <ScrollArea className="h-full w-full px-6 py-5">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onSelectSource(source.id)}
                  className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="block text-base font-semibold text-foreground">
                    {source.label}
                  </span>
                  {source.description && (
                    <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                      {source.description}
                    </span>
                  )}
                  <span className="mt-2 block text-xs text-slate-400">
                    {source.books.length} livre(s) / norme(s)
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Stage 2 – Book tiles within selected source */}
        {selectedSource && !selectedBook && (
          <ScrollArea className="h-full w-full px-6 py-5">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => onSelectBook(book.id)}
                  className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="block text-base font-semibold text-foreground">
                    {book.label}
                  </span>
                  {book.heading && (
                    <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                      {book.heading}
                    </span>
                  )}
                  {book.articlesRange && (
                    <span className="mt-2 block text-xs text-slate-400">
                      {book.articlesRange}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Stage 3 – Chapters list */}
        {selectedBook && !selectedChapter && (
          <ScrollArea className="h-full w-full px-5 py-4">
            {chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun chapitre défini pour ce livre pour le moment.
              </p>
            ) : (
              <nav className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => onSelectChapter(chapter.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <List className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">
                        {chapter.label}
                      </span>
                      {chapter.heading && (
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {chapter.heading}
                        </span>
                      )}
                      {chapter.articlesRange && (
                        <span className="mt-1 block text-xs text-slate-400">
                          {chapter.articlesRange}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                  </button>
                ))}
              </nav>
            )}
          </ScrollArea>
        )}

        {/* Stage 4 – Chapter text content */}
        {selectedChapter && (
          <div className="h-full w-full overflow-hidden p-1">
            <ChapterContent
              chapter={selectedChapter}
              scrollTargetId={scrollTargetId}
              isBookmarked={isBookmarked}
              onToggleBookmark={onToggleBookmark}
            />
          </div>
        )}
      </div>
    </div>
  );
}

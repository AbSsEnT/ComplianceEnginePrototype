"use client";

import type { LawBook, LawNode, LawSource } from "@/lib/law/types";
import ChapterContent from "./ChapterContent";

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

  const selectedBook: LawBook | null = books.find((b) => b.id === selectedBookId) ?? null;

  const chapters: LawNode[] =
    selectedBook?.children?.filter((c) => c.kind === "chapter") ?? [];

  const selectedChapter: LawNode | null =
    chapters.find((c) => c.id === selectedChapterId) ?? null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white">
      {/* Breadcrumb — always present, crumbs appear progressively */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-zinc-200 px-5 py-3 text-sm">
        {selectedSource ? (
          <button
            type="button"
            onClick={onClearSource}
            className="text-zinc-500 transition hover:text-zinc-900"
          >
            Bibliotheque
          </button>
        ) : (
          <span className="font-medium text-zinc-900">Bibliotheque</span>
        )}

        {selectedSource && (
          <>
            <span className="text-zinc-300">/</span>
            {selectedBook ? (
              <button
                type="button"
                onClick={onClearBook}
                className="text-zinc-500 transition hover:text-zinc-900"
              >
                {selectedSource.label}
              </button>
            ) : (
              <span className="font-medium text-zinc-900">
                {selectedSource.label}
              </span>
            )}
          </>
        )}

        {selectedBook && (
          <>
            <span className="text-zinc-300">/</span>
            {selectedChapter ? (
              <button
                type="button"
                onClick={() => onSelectBook(selectedBook.id)}
                className="text-zinc-500 transition hover:text-zinc-900"
              >
                {selectedBook.label}
              </button>
            ) : (
              <span className="font-medium text-zinc-900">
                {selectedBook.label}
              </span>
            )}
          </>
        )}

        {selectedChapter && (
          <>
            <span className="text-zinc-300">/</span>
            <span className="font-medium text-zinc-900">
              {selectedChapter.label}
            </span>
          </>
        )}
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-hidden">
        {/* Stage 1 – source tiles */}
        {!selectedSource && (
          <div className="h-full w-full overflow-y-auto px-6 py-5">
            <div className="grid w-full grid-cols-1 gap-4">
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onSelectSource(source.id)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-left transition hover:border-zinc-400 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                >
                  <span className="block text-base font-semibold text-zinc-900">
                    {source.label}
                  </span>
                  {source.description && (
                    <span className="mt-1 block text-sm leading-snug text-zinc-600">
                      {source.description}
                    </span>
                  )}
                  <span className="mt-2 block text-xs text-zinc-400">
                    {source.books.length} livre(s) / norme(s)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stage 2 – book tiles within selected source */}
        {selectedSource && !selectedBook && (
          <div className="h-full w-full overflow-y-auto px-6 py-5">
            <div className="grid w-full grid-cols-1 gap-4">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => onSelectBook(book.id)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-left transition hover:border-zinc-400 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                >
                  <span className="block text-base font-semibold text-zinc-900">
                    {book.label}
                  </span>
                  {book.heading && (
                    <span className="mt-1 block text-sm leading-snug text-zinc-600">
                      {book.heading}
                    </span>
                  )}
                  {book.articlesRange && (
                    <span className="mt-2 block text-xs text-zinc-400">
                      {book.articlesRange}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stage 3 – chapters list */}
        {selectedBook && !selectedChapter && (
          <div className="h-full w-full overflow-y-auto px-5 py-4">
            {chapters.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucun chapitre defini pour ce livre pour le moment.
              </p>
            ) : (
              <nav className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => onSelectChapter(chapter.id)}
                    className="flex w-full flex-col rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition hover:border-zinc-400 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  >
                    <span className="font-medium text-zinc-900">
                      {chapter.label}
                    </span>
                    {chapter.heading && (
                      <span className="mt-0.5 text-sm text-zinc-600">
                        {chapter.heading}
                      </span>
                    )}
                    {chapter.articlesRange && (
                      <span className="mt-1 text-xs text-zinc-400">
                        {chapter.articlesRange}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            )}
          </div>
        )}

        {/* Stage 4 – chapter text */}
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

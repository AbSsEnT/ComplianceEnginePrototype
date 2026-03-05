"use client";

import { useMemo, useState } from "react";
import type { LawBook, LawNode } from "@/lib/law/types";
import BookSelector from "./BookSelector";
import ChapterList from "./ChapterList";
import ChapterContent from "./ChapterContent";

interface LawViewerProps {
  books: LawBook[];
}

export default function LawViewer({ books }: LawViewerProps) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );

  const selectedBook: LawBook | null = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  const chapters: LawNode[] = useMemo(() => {
    if (!selectedBook?.children) return [];
    return selectedBook.children.filter((child) => child.kind === "chapter");
  }, [selectedBook]);

  const selectedChapter: LawNode | null = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId);
    setSelectedChapterId(null);
  };

  const handleChapterSelect = (chapterId: string) => {
    setSelectedChapterId(chapterId);
  };

  return (
    <div className="flex h-full flex-1 flex-col gap-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          Livres
        </h2>
        <BookSelector
          books={books}
          selectedBookId={selectedBookId}
          onSelect={handleBookSelect}
        />
      </section>

      <section className="flex flex-1 flex-col gap-4 md:flex-row">
        <aside className="w-full shrink-0 md:w-64">
          <div className="h-full rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              Chapitres
            </h2>
            <ChapterList
              chapters={chapters}
              hasSelectedBook={!!selectedBook}
              selectedChapterId={selectedChapterId}
              onSelect={handleChapterSelect}
            />
          </div>
        </aside>
        <section className="flex min-h-[320px] flex-1">
          <ChapterContent chapter={selectedChapter} />
        </section>
      </section>
    </div>
  );
}


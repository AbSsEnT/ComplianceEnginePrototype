"use client";

import type { LawBook } from "@/lib/law/types";

interface BookSelectorProps {
  books: LawBook[];
  selectedBookId: string | null;
  onSelect: (bookId: string) => void;
}

export default function BookSelector({
  books,
  selectedBookId,
  onSelect,
}: BookSelectorProps) {
  if (!books.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Aucun livre disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {books.map((book) => {
        const isSelected = book.id === selectedBookId;
        return (
          <button
            key={book.id}
            type="button"
            onClick={() => onSelect(book.id)}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
              isSelected
                ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
            ].join(" ")}
          >
            {book.label}
          </button>
        );
      })}
    </div>
  );
}


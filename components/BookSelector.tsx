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
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
              isSelected
                ? "border-zinc-400 bg-zinc-200 text-zinc-900"
                : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50",
            ].join(" ")}
          >
            {book.label}
          </button>
        );
      })}
    </div>
  );
}


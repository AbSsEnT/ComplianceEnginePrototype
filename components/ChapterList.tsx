"use client";

import type { LawNode } from "@/lib/law/types";
import { useI18n } from "@/lib/i18n";

interface ChapterListProps {
  chapters: LawNode[];
  hasSelectedBook: boolean;
  selectedChapterId: string | null;
  onSelect: (chapterId: string) => void;
}

export default function ChapterList({
  chapters,
  hasSelectedBook,
  selectedChapterId,
  onSelect,
}: ChapterListProps) {
  const { locale } = useI18n();
  if (!hasSelectedBook) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
        {locale === "de"
          ? "Wählen Sie ein Buch, um seine Kapitel zu sehen."
          : "Sélectionnez un livre pour voir ses chapitres."}
      </div>
    );
  }

  if (!chapters.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
        {locale === "de"
          ? "Für dieses Buch sind keine Kapitel definiert."
          : "Aucun chapitre défini pour ce livre."}
      </div>
    );
  }

  return (
    <nav className="space-y-1 text-sm">
      {chapters.map((chapter) => {
        const isSelected = chapter.id === selectedChapterId;
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onSelect(chapter.id)}
            className={[
              "flex w-full items-start rounded-md px-3 py-2 text-left transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
              isSelected
                ? "bg-zinc-200 text-zinc-900"
                : "bg-white text-zinc-800 hover:bg-zinc-100",
            ].join(" ")}
          >
            <div className="flex flex-col">
              <span className="font-medium">{chapter.label}</span>
              {chapter.articlesRange && (
                <span className="text-xs text-zinc-500">
                  {chapter.articlesRange}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}


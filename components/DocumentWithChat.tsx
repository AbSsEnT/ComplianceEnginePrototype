"use client";

import { useMemo, useState } from "react";
import type { LawBook, LawNode, LawReference } from "@/lib/law/types";
import ChatPanel from "./ChatPanel";
import LawViewer from "./LawViewer";

interface DocumentWithChatProps {
  books: LawBook[];
}

export default function DocumentWithChat({ books }: DocumentWithChatProps) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const bookIndex = useMemo(() => buildIndex(books), [books]);

  const handleReferenceClick = (ref: LawReference) => {
    const targetId = ref.paragraphId ?? ref.articleId;
    if (!targetId) return;

    const path = bookIndex[targetId];
    if (!path) return;

    setSelectedBookId(path.bookId);
    setSelectedChapterId(path.chapterId ?? null);
    // Defer scroll target slightly so chapter content re-renders first
    setTimeout(() => setScrollTargetId(targetId), 0);
  };

  return (
    <div className="grid h-full grid-cols-[360px_1fr] gap-6">
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
        />
      </div>
    </div>
  );
}

type IndexEntry = {
  bookId: string;
  chapterId?: string;
};

type Index = Record<string, IndexEntry>;

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


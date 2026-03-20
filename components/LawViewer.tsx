"use client";

import React from "react";
import type {
  LawBook,
  LawNode,
  LawSource,
  JurisdictionCode,
  SourceType,
} from "@/lib/law/types";
import ChapterContent from "./ChapterContent";
import { ChevronRight, BookOpen, FileText, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";

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

  const { t, locale } = useI18n();

  // ── Derived filters for the source tiles stage ──
  const allJurisdictions: JurisdictionCode[] = ["FR", "DE", "EU"];
  const typeOrder: SourceType[] = ["LAW_AND_CODE", "STANDARD", "INSURER_STANDARD"];

  // For now we keep the filters local to this viewer.
  const [activeSourceTypes, setActiveSourceTypes] = React.useState<
    SourceType[]
  >(typeOrder);
  const [activeJurisdictions, setActiveJurisdictions] =
    React.useState<JurisdictionCode[]>(allJurisdictions);

  const toggleSourceType = (type: SourceType) => {
    setActiveSourceTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  const toggleJurisdiction = (code: JurisdictionCode) => {
    setActiveJurisdictions((prev) =>
      prev.includes(code)
        ? prev.filter((j) => j !== code)
        : [...prev, code],
    );
  };

  const filteredSources = sources.filter(
    (s) =>
      activeSourceTypes.includes(s.sourceType) &&
      activeJurisdictions.includes(s.jurisdiction),
  );

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
            {t.library.breadcrumbRoot}
          </button>
        ) : (
          <span className="font-medium text-foreground">
            {t.library.breadcrumbRoot}
          </span>
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
        {/* Stage 1 – Source tiles (grouped by type with filters) */}
        {!selectedSource && (
          <ScrollArea className="h-full w-full px-6 py-5">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
              {/* Filter chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-muted-foreground">
                    {t.library.filterTypesLabel}
                  </span>
                  {typeOrder.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSourceType(type)}
                      className={[
                        "rounded-full border px-2.5 py-1 transition",
                        activeSourceTypes.includes(type)
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-border bg-card text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {type === "LAW_AND_CODE" && t.library.typeLawAndCode}
                      {type === "STANDARD" && t.library.typeStandard}
                      {type === "INSURER_STANDARD" &&
                        t.library.typeInsurerStandard}
                      {type === "GUIDE" && t.library.typeGuide}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-muted-foreground">
                    {t.library.filterJurisdictionsLabel}
                  </span>
                  {allJurisdictions.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleJurisdiction(code)}
                      className={[
                        "rounded-full border px-2 py-1 text-[11px] transition",
                        activeJurisdictions.includes(code)
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-border bg-card text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {code === "FR" && "France"}
                      {code === "DE" && "Allemagne"}
                      {code === "EU" && "UE / Europe"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grouped source tiles */}
              {typeOrder.map((type) => {
                const sourcesOfType = filteredSources.filter(
                  (s) => s.sourceType === type,
                );
                if (sourcesOfType.length === 0) return null;

                return (
                  <section key={type} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {type === "LAW_AND_CODE" &&
                        t.library.sectionLawAndCode}
                      {type === "STANDARD" && t.library.sectionStandard}
                      {type === "INSURER_STANDARD" &&
                        t.library.sectionInsurerStandard}
                      {type === "GUIDE" && t.library.sectionGuide}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {sourcesOfType.map((source) => {
                        const displayLabel =
                          locale === "de" && source.labelDe
                            ? source.labelDe
                            : source.label;
                        const displayDescription =
                          locale === "de" && source.descriptionDe
                            ? source.descriptionDe
                            : source.description;
                        return (
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
                              {displayLabel}
                            </span>
                            {displayDescription && (
                              <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                                {displayDescription}
                              </span>
                            )}
                            <div className="mt-2 flex itemscenter justify-between text-xs text-slate-400">
                              <span>
                                {source.books.length} livre(s) / norme(s)
                              </span>
                              <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {source.jurisdiction === "FR" && "FR"}
                                {source.jurisdiction === "DE" && "DE"}
                                {source.jurisdiction === "EU" && "EU"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
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
                {t.library.noChapters}
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

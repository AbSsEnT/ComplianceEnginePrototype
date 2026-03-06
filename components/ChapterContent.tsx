"use client";

import { useEffect, useState } from "react";
import type { LawNode } from "@/lib/law/types";

interface ChapterContentProps {
  chapter: LawNode | null;
  scrollTargetId?: string | null;
  isBookmarked?: (ref: { articleId: string; paragraphId?: string }) => boolean;
  onToggleBookmark?: (
    ref: { articleId: string; paragraphId?: string },
    meta: { title: string; excerpt: string },
  ) => void;
}

const HIGHLIGHT_CONTAINER_ATTR = "data-scroll-highlight-container";

export default function ChapterContent({
  chapter,
  scrollTargetId,
  isBookmarked,
  onToggleBookmark,
}: ChapterContentProps) {
  const [highlightedContainerId, setHighlightedContainerId] = useState<
    string | null
  >(null);

  if (!chapter) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-base text-zinc-600">
        Sélectionnez un livre puis un chapitre pour afficher son contenu.
      </div>
    );
  }

  const sections =
    chapter.children?.filter((child) => child.kind === "section") ?? [];
  const directArticles =
    chapter.children?.filter((child) => child.kind === "article") ?? [];

  useEffect(() => {
    if (!scrollTargetId) return;
    const raw = document.getElementById(scrollTargetId);
    if (!raw) return;

    const container =
      (raw.closest?.(
        `[${HIGHLIGHT_CONTAINER_ATTR}="true"]`,
      ) as HTMLElement | null) ?? (raw as HTMLElement);

    container.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedContainerId(container.id || scrollTargetId);

    const timer = setTimeout(() => {
      setHighlightedContainerId((curr) =>
        curr === (container.id || scrollTargetId) ? null : curr,
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [scrollTargetId, chapter?.id]);

  return (
    <div className="h-full overflow-y-auto rounded-lg border border-zinc-200 bg-white px-4 py-4 text-base leading-relaxed md:px-6 md:py-5">
      <header className="mb-4 border-b border-zinc-200 pb-3">
        <h2 className="text-lg font-semibold">{chapter.label}</h2>
        {chapter.heading && (
          <p className="mt-1 text-xs text-zinc-600">
            {chapter.heading}
          </p>
        )}
        {chapter.articlesRange && (
          <p className="mt-1 text-xs text-zinc-500">
            {chapter.articlesRange}
          </p>
        )}
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            highlightedContainerId={highlightedContainerId}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />
        ))}

        {!!directArticles.length && (
          <div className="space-y-4">
            {directArticles.map((article) => (
              <ArticleBlock
                key={article.id}
                article={article}
                highlightedContainerId={highlightedContainerId}
              />
            ))}
          </div>
        )}

        {!sections.length && !directArticles.length && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aucun contenu disponible pour ce chapitre.
          </p>
        )}
      </div>
    </div>
  );
}

interface SectionBlockProps {
  section: LawNode;
  highlightedContainerId: string | null;
  isBookmarked?: (ref: { articleId: string; paragraphId?: string }) => boolean;
  onToggleBookmark?: (
    ref: { articleId: string; paragraphId?: string },
    meta: { title: string; excerpt: string },
  ) => void;
}

function SectionBlock({
  section,
  highlightedContainerId,
  isBookmarked,
  onToggleBookmark,
}: SectionBlockProps) {
  const articles =
    section.children?.filter((child) => child.kind === "article") ?? [];

  return (
    <section className="border-l-2 border-zinc-200 pl-4">
      <h3 className="text-base font-semibold uppercase tracking-wide text-zinc-700">
        {section.label}
      </h3>
      {section.heading && (
        <p className="mt-1 text-sm text-zinc-600">
          {section.heading}
        </p>
      )}
      {section.articlesRange && (
        <p className="mt-1 text-[12px] text-zinc-500">
          {section.articlesRange}
        </p>
      )}
      <div className="mt-3 space-y-4">
        {articles.map((article) => (
          <ArticleBlock
            key={article.id}
            article={article}
            highlightedContainerId={highlightedContainerId}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </div>
    </section>
  );
}

interface ArticleBlockProps {
  article: LawNode;
  highlightedContainerId: string | null;
  isBookmarked?: (ref: { articleId: string; paragraphId?: string }) => boolean;
  onToggleBookmark?: (
    ref: { articleId: string; paragraphId?: string },
    meta: { title: string; excerpt: string },
  ) => void;
}

function ArticleBlock({
  article,
  highlightedContainerId,
  isBookmarked,
  onToggleBookmark,
}: ArticleBlockProps) {
  const paragraphs =
    article.children?.filter((child) => child.kind === "paragraph") ?? [];

  const isHighlighted = highlightedContainerId === article.id;
  const articleBookmarked =
    isBookmarked?.({ articleId: article.id }) ?? false;

  const articleExcerpt = (() => {
    if (article.content) return article.content.slice(0, 240);
    if (!paragraphs.length) return "";
    const combined = paragraphs
      .map((p) => p.content ?? "")
      .join(" ");
    return combined.slice(0, 240);
  })();

  return (
    <article
      id={article.id}
      {...{ [HIGHLIGHT_CONTAINER_ATTR]: "true" }}
      className={[
        "relative rounded-md border bg-zinc-50 px-3 py-2 text-base transition-colors",
        "border-zinc-200 hover:border-zinc-400",
        isHighlighted ? "border-zinc-400" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={() =>
          onToggleBookmark?.(
            { articleId: article.id },
            {
              title: article.label,
              excerpt: articleExcerpt,
            },
          )
        }
        className={[
          "absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition",
          articleBookmarked
            ? "bg-amber-100 text-amber-700"
            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={
          articleBookmarked
            ? "Retirer le signet de l'article"
            : "Ajouter un signet à l'article"
        }
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4"
        >
          {articleBookmarked ? (
            <path
              d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"
              fill="currentColor"
            />
          ) : (
            <path
              d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15.11-5-2.15-5 2.15V5h10z"
              fill="currentColor"
            />
          )}
        </svg>
      </button>
      <h4 className="text-base font-semibold">
        {article.label}
        {article.heading ? ` – ${article.heading}` : null}
      </h4>
      {paragraphs.length > 0 ? (
        <div className="mt-2 space-y-3">
          {paragraphs.map((para) => (
            (() => {
              const isParaHighlighted = highlightedContainerId === para.id;
              const paraBookmarked =
                isBookmarked?.({
                  articleId: article.id,
                  paragraphId: para.id,
                }) ?? false;
              const paraExcerpt = (para.content ?? "").slice(0, 240);
              return (
            <div
              key={para.id}
              id={para.id}
              {...{ [HIGHLIGHT_CONTAINER_ATTR]: "true" }}
              className={[
                "relative rounded border bg-white px-3 py-2 text-sm leading-relaxed transition-colors",
                "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50",
                isParaHighlighted ? "border-zinc-400 bg-zinc-50" : null,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                onClick={() =>
                  onToggleBookmark?.(
                    { articleId: article.id, paragraphId: para.id },
                    {
                      title: para.label
                        ? `${article.label} – ${para.label}`
                        : article.label,
                      excerpt: paraExcerpt,
                    },
                  )
                }
                className={[
                  "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full transition",
                  paraBookmarked
                    ? "bg-amber-100 text-amber-700"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  paraBookmarked
                    ? "Retirer le signet du paragraphe"
                    : "Ajouter un signet au paragraphe"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  {paraBookmarked ? (
                    <path
                      d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"
                      fill="currentColor"
                    />
                  ) : (
                    <path
                      d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15.11-5-2.15-5 2.15V5h10z"
                      fill="currentColor"
                    />
                  )}
                </svg>
              </button>
              {para.label && (
                <div className="mb-1 font-semibold text-zinc-700">
                  {para.label}
                </div>
              )}
              {para.content && (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-800">
                  {para.content}
                </p>
              )}
            </div>
              );
            })()
          ))}
        </div>
      ) : (
        article.content && (
          <p className="mt-2 whitespace-pre-wrap text-base text-zinc-800">
            {article.content}
          </p>
        )
      )}
    </article>
  );
}


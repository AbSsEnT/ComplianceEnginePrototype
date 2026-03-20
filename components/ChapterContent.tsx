 "use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { LawNode } from "@/lib/law/types";
import { Bookmark } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";

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

/**
 * Heuristic helper: detect whether a paragraph string is really a
 * markdown table (for example the APSAD D9A volume diagram) so we can
 * render it with proper table semantics instead of as plain text.
 *
 * This keeps the generic `LawNode` shape simple while still giving
 * rich rendering for "graph" style content that is stored as
 * `content_markdown` in the JSON.
 */
function looksLikeMarkdownTable(content: string): boolean {
  const trimmed = content.trimStart();
  // Most markdown tables start with a header row like "| A | B |"
  // followed by a separator row "|---|---|". We just look for those
  // patterns so the heuristic stays cheap and easy to reason about.
  return trimmed.startsWith("|") && trimmed.includes("|---");
}

/**
 * Heuristic to visually indent "list-like" paragraphs.
 *
 * Our FM converter encodes bullet points as plain text paragraphs starting
 * with `• `. Indenting makes the PDF-like structure easier to follow
 * without changing your atomic paragraph splits.
 */
function looksLikeListParagraph(content: string): boolean {
  const trimmed = content.trimStart();
  return (
    trimmed.startsWith("• ") ||
    /^[A-Z]\.\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^[-–]\s+/.test(trimmed)
  );
}

export default function ChapterContent({
  chapter,
  scrollTargetId,
  isBookmarked,
  onToggleBookmark,
}: ChapterContentProps) {
  const [highlightedContainerId, setHighlightedContainerId] = useState<
    string | null
  >(null);
  const [openImage, setOpenImage] = useState<
    | { src: string; alt: string }
    | null
  >(null);
  const [imageZoom, setImageZoom] = useState(1);

  const { locale } = useI18n();

  if (!chapter) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-base text-muted-foreground">
        {locale === "de"
          ? "Wählen Sie ein Buch und dann ein Kapitel aus, um den Inhalt anzuzeigen."
          : "Sélectionnez un livre puis un chapitre pour afficher son contenu."}
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

  useEffect(() => {
    // When opening a new image (especially an SVG figure), reset zoom.
    setImageZoom(1);
  }, [openImage?.src]);

  return (
    <ScrollArea className="h-full rounded-xl border border-border bg-card px-4 py-4 text-base leading-relaxed md:px-6 md:py-5">
      <header className="mb-4 border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-foreground">
          {chapter.label}
        </h2>
        {chapter.heading && (
          <p className="mt-1 text-xs text-muted-foreground">
            {chapter.heading}
          </p>
        )}
        {chapter.articlesRange && (
          <p className="mt-1 text-xs text-slate-400">
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
            onOpenImage={setOpenImage}
          />
        ))}

        {!!directArticles.length && (
          <div className="space-y-4">
            {directArticles.map((article) => (
              <ArticleBlock
                key={article.id}
                article={article}
                highlightedContainerId={highlightedContainerId}
                isBookmarked={isBookmarked}
                onToggleBookmark={onToggleBookmark}
                onOpenImage={setOpenImage}
              />
            ))}
          </div>
        )}

        {!sections.length && !directArticles.length && (
          <p className="text-sm text-muted-foreground">
            {locale === "de"
              ? "Für dieses Kapitel ist derzeit kein Inhalt verfügbar."
              : "Aucun contenu disponible pour ce chapitre."}
          </p>
        )}
      </div>

      {/* Full-screen image popup for APSAD diagrams (custom overlay, not Dialog) */}
      {openImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpenImage(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] overflow-auto rounded-xl bg-white p-2 md:p-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              // Wheel zoom for figures (SVG included).
              e.preventDefault();
              const direction = e.deltaY < 0 ? 1 : -1;
              const step = 0.5;
              setImageZoom((z) => {
                const next = z + direction * step;
                return Math.max(0.5, Math.min(4, Math.round(next * 100) / 100));
              });
            }}
          >
            <button
              type="button"
              onClick={() => setOpenImage(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white"
            >
              {locale === "de" ? "Schließen" : "Fermer"}
            </button>

            <div
              className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-foreground"
                onClick={() =>
                  setImageZoom((z) =>
                    Math.max(0.5, Math.round((z - 0.5) * 100) / 100),
                  )
                }
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="text-xs font-semibold text-white">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                type="button"
                className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-foreground"
                onClick={() =>
                  setImageZoom((z) =>
                    Math.min(4, Math.round((z + 0.5) * 100) / 100),
                  )
                }
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            <img
              src={openImage.src}
              alt={openImage.alt}
              className="mx-auto h-auto max-h-none w-auto max-w-[90vw] origin-center object-contain"
              style={{ transform: `scale(${imageZoom})`, transformOrigin: "center center" }}
            />
          </div>
        </div>
      )}
    </ScrollArea>
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
  onOpenImage: (img: { src: string; alt: string }) => void;
  /** Used to indent nested sections so the visual hierarchy matches the PDF. */
  depth?: number;
}

function SectionBlock({
  section,
  highlightedContainerId,
  isBookmarked,
  onToggleBookmark,
  onOpenImage,
  depth = 0,
}: SectionBlockProps) {
  const children = section.children ?? [];

  // Tailwind classes must be static; we support up to 2 nested levels for FM breadcrumbs.
  const indent = depth === 0 ? "pl-4" : depth === 1 ? "pl-6" : "pl-8";
  const shouldCombineHeadingLine = depth <= 1 && !!section.heading;

  return (
    <section className={["border-l-2 border-blue-200", indent].join(" ")}>
      <h3
        className={[
          shouldCombineHeadingLine ? "whitespace-nowrap" : "",
          shouldCombineHeadingLine
            ? depth === 0
              ? "text-lg"
              : "text-base"
            : "text-base",
          shouldCombineHeadingLine
            ? "font-semibold text-foreground"
            : "font-semibold uppercase tracking-wide text-slate-700",
        ].join(" ")}
      >
        {shouldCombineHeadingLine
          ? `${section.label} ${section.heading}`
          : section.label}
      </h3>
      {section.heading && !shouldCombineHeadingLine && (
        <p className="mt-1 text-sm text-muted-foreground">
          {section.heading}
        </p>
      )}
      {section.articlesRange && (
        <p className="mt-1 text-[12px] text-slate-400">
          {section.articlesRange}
        </p>
      )}
      <div className="mt-3 space-y-4">
        {children.map((child) => {
          if (child.kind === "section") {
            return (
              <SectionBlock
                key={child.id}
                section={child}
                highlightedContainerId={highlightedContainerId}
                isBookmarked={isBookmarked}
                onToggleBookmark={onToggleBookmark}
                onOpenImage={onOpenImage}
                depth={depth + 1}
              />
            );
          }

          if (child.kind === "article") {
            return (
              <ArticleBlock
                key={child.id}
                article={child}
                highlightedContainerId={highlightedContainerId}
                isBookmarked={isBookmarked}
                onToggleBookmark={onToggleBookmark}
                onOpenImage={onOpenImage}
              />
            );
          }

          return null;
        })}
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
  onOpenImage: (img: { src: string; alt: string }) => void;
}

function ArticleBlock({
  article,
  highlightedContainerId,
  isBookmarked,
  onToggleBookmark,
  onOpenImage,
}: ArticleBlockProps) {
  const paragraphs =
    article.children?.filter((child) => child.kind === "paragraph") ?? [];

  const isHighlighted = highlightedContainerId === article.id;
  // FM conversion may generate a "-content" article node to keep the UI tree compatible
  // with paragraphs-only leaves, while still rendering the real heading as the section title.
  const hideArticleHeader = article.id.endsWith("-content");
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
        "relative rounded-lg border bg-muted/30 px-3 py-2 text-base transition-all",
        isHighlighted
          ? "border-blue-400 bg-blue-50/50 shadow-sm"
          : "border-border hover:border-slate-300",
      ].join(" ")}
    >
      {/* Bookmark toggle for the article */}
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
            : "text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 [article:hover>&]:opacity-100",
        ].join(" ")}
        aria-label={
          articleBookmarked
            ? "Retirer le signet de l'article"
            : "Ajouter un signet à l'article"
        }
      >
        <Bookmark
          className="h-4 w-4"
          fill={articleBookmarked ? "currentColor" : "none"}
        />
      </button>

      {!hideArticleHeader && (
        <h4 className="text-base font-semibold text-foreground">
          {article.label}
          {article.heading ? ` – ${article.heading}` : null}
        </h4>
      )}

      {paragraphs.length > 0 ? (
        <div className="mt-2 space-y-3">
          {paragraphs.map((para) => {
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
                  "group/para relative rounded-lg border bg-card px-3 py-2 text-sm leading-relaxed transition-all",
                  isParaHighlighted
                    ? "border-blue-400 bg-blue-50/50 shadow-sm"
                    : "border-border hover:border-slate-300",
                ].join(" ")}
              >
                {/* Bookmark toggle for the paragraph */}
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
                      : "text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover/para:opacity-100",
                  ].join(" ")}
                  aria-label={
                    paraBookmarked
                      ? "Retirer le signet du paragraphe"
                      : "Ajouter un signet au paragraphe"
                  }
                >
                  <Bookmark
                    className="h-3.5 w-3.5"
                    fill={paraBookmarked ? "currentColor" : "none"}
                  />
                </button>

                {para.label && (
                  <div className="mb-1 font-semibold text-slate-700">
                    {para.label}
                  </div>
                )}

                {/* For now, render the two APSAD D9A "graph" paragraphs as clickable screenshots
                   instead of parsing their markdown tables. The IDs come from the adapter in
                   `libraryCatalog.ts`:
                   - `apsad-d9a-2.2-p5`   → section 2.2 table
                   - `apsad-d9a-annexe-p11` → annex example table
                   These IDs keep the implementation explicit and easy to refactor later. */}
                {para.id === "apsad-d9a-2.2-p5" && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenImage({
                        src: "/guide_pratique_d9a_juin_2020_graph_1.jpeg",
                        alt: "Tableau de calcul du volume à mettre en rétention (guide D9A)",
                      })
                    }
                    className="mt-3 inline-block w-full cursor-zoom-in rounded-lg border border-slate-200 bg-white p-2 transition hover:shadow-md"
                  >
                    <img
                      src="/guide_pratique_d9a_juin_2020_graph_1.jpeg"
                      alt="Tableau de calcul du volume à mettre en rétention (guide D9A)"
                      className="max-h-[520px] w-full max-w-full object-contain"
                    />
                  </button>
                )}

                {para.id === "apsad-d9a-annexe-p11" && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenImage({
                        src: "/guide_pratique_d9a_juin_2020_graph_2.jpeg",
                        alt: "Tableau récapitulatif de l'exemple de calcul (annexe D9A)",
                      })
                    }
                    className="mt-3 inline-block w-full cursor-zoom-in rounded-lg border border-slate-200 bg-white p-2 transition hover:shadow-md"
                  >
                    <img
                      src="/guide_pratique_d9a_juin_2020_graph_2.jpeg"
                      alt="Tableau récapitulatif de l'exemple de calcul (annexe D9A)"
                      className="max-h-[520px] w-full max-w-full object-contain"
                    />
                  </button>
                )}

                {/* Fallback for all other paragraphs: keep the existing rich-text behaviour. */}
                {para.content &&
                  para.id !== "apsad-d9a-2.2-p5" &&
                  para.id !== "apsad-d9a-annexe-p11" &&
                  (looksLikeMarkdownTable(para.content) ? (
                    <div className="prose prose-sm max-w-none [&_table]:w-full [&_table]:text-xs [&_th]:bg-slate-100 [&_th]:font-semibold [&_td]:align-top [&_td]:p-1.5">
                      <ReactMarkdown>{para.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p
                      className={[
                        "whitespace-pre-wrap text-base leading-relaxed text-foreground",
                        looksLikeListParagraph(para.content ?? "")
                          ? "pl-6"
                          : "",
                      ].join(" ")}
                    >
                      {para.content}
                    </p>
                  ))}

                {/* FM Global figure rendering (inserted after the referencing paragraph). */}
                {para.id === "2.1.1_para_2" && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenImage({
                        src: "/fm/FMDS0200-001-013-FIG_2_1_1.svg",
                        alt: "Figure 2.1.1",
                      })
                    }
                    className="mt-3 inline-block w-full cursor-zoom-in rounded-lg border border-slate-200 bg-white p-2 transition hover:shadow-md"
                  >
                    <img
                      src="/fm/FMDS0200-001-013-FIG_2_1_1.svg"
                      alt="Figure 2.1.1"
                      className="max-h-[520px] w-full max-w-full object-contain"
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        article.content &&
        (looksLikeMarkdownTable(article.content) ? (
          <div className="mt-2 prose prose-sm max-w-none [&_table]:w-full [&_table]:text-xs [&_th]:bg-slate-100 [&_th]:font-semibold [&_td]:align-top [&_td]:p-1.5">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        ) : (
          <p
            className={[
              "mt-2 whitespace-pre-wrap text-base text-foreground",
              looksLikeListParagraph(article.content ?? "")
                ? "pl-6"
                : "",
            ].join(" ")}
          >
            {article.content}
          </p>
        ))
      )}
    </article>
  );
}

 "use client";

/**
 * SourcePreviewPanel — slides in from the right inside the ChatView
 * to show the content of a referenced article/paragraph.
 *
 * Given a LawReference (articleId + optional paragraphId) and the full
 * list of LawSources, it traverses the tree to find the node and its
 * breadcrumb path, then renders the content inline so the user can
 * verify a citation without leaving the conversation.
 */

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { LawNode, LawReference, LawSource } from "@/lib/law/types";
import { X, ExternalLink, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

/* ── Props ── */

interface SourcePreviewPanelProps {
  reference: LawReference;
  sources: LawSource[];
  onClose: () => void;
  /** Navigate to the full Bibliothèque view for deeper reading. */
  onOpenInLibrary?: (ref: LawReference) => void;
}

/* ── Tree lookup ── */

/**
 * Breadcrumb trail returned by the lookup: each step is a label
 * describing one level of the source tree (source → book → chapter → …).
 */
interface LookupResult {
  breadcrumb: string[];
  article: LawNode;
  /** The specific paragraph node, if a paragraphId was requested and found. */
  paragraph?: LawNode;
}

/**
 * Recursively search the LawNode tree for an article matching `articleId`.
 * Returns the node and the path of labels leading to it.
 */
function findArticle(
  nodes: LawNode[],
  articleId: string,
  path: string[],
): { node: LawNode; path: string[] } | null {
  for (const node of nodes) {
    if (node.kind === "article" && node.id === articleId) {
      return { node, path };
    }
    if (node.children) {
      const result = findArticle(node.children, articleId, [
        ...path,
        node.label,
      ]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Resolve a LawReference to the full article node, optional paragraph,
 * and a human-readable breadcrumb trail.
 */
function lookupReference(
  sources: LawSource[],
  ref: LawReference,
): LookupResult | null {
  for (const source of sources) {
    for (const book of source.books) {
      const found = findArticle(book.children ?? [], ref.articleId, [
        source.label,
        book.label,
      ]);
      if (found) {
        let paragraph: LawNode | undefined;
        if (ref.paragraphId && found.node.children) {
          paragraph = found.node.children.find(
            (c) => c.id === ref.paragraphId,
          );
        }
        return {
          breadcrumb: found.path,
          article: found.node,
          paragraph,
        };
      }
    }
  }
  return null;
}

/* ── Component ── */

export default function SourcePreviewPanel({
  reference,
  sources,
  onClose,
  onOpenInLibrary,
}: SourcePreviewPanelProps) {
  const result = useMemo(
    () => lookupReference(sources, reference),
    [sources, reference],
  );
  const [openImage, setOpenImage] = useState<
    | { src: string; alt: string }
    | null
  >(null);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-background"
    >
      {/* Header with breadcrumb + close */}
      <div className="flex shrink-0 items-start justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </h3>

          {/* Breadcrumb trail */}
          {result && (
            <div className="mt-1 flex flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground">
              {result.breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && (
                    <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50" />
                  )}
                  <span className="truncate">{crumb}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Fermer le panneau source"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4">
          {!result ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Source introuvable dans la bibliothèque.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Référence : {reference.articleId}
                {reference.paragraphId ? ` / ${reference.paragraphId}` : ""}
              </p>
            </div>
          ) : (
            <>
              {/* Article header */}
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {result.article.label}
                </h4>
                {result.article.heading && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {result.article.heading}
                  </p>
                )}
              </div>

              {/* If a specific paragraph was requested, highlight it */}
              {result.paragraph ? (
                <HighlightedParagraph
                  article={result.article}
                  targetParagraph={result.paragraph}
                  onOpenImage={setOpenImage}
                />
              ) : (
                <ArticleContent
                  article={result.article}
                  onOpenImage={setOpenImage}
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Large image popup for APSAD diagrams (custom overlay) */}
      {openImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpenImage(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] overflow-auto rounded-xl bg-white p-2 md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenImage(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white"
            >
              Fermer
            </button>
            <img
              src={openImage.src}
              alt={openImage.alt}
              className="mx-auto h-auto max-h-[85vh] w-auto max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}

      {/* Footer with "Open in Bibliothèque" button */}
      {result && onOpenInLibrary && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => onOpenInLibrary(reference)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir dans la Bibliothèque
          </Button>
        </div>
      )}
    </motion.aside>
  );
}

/* ── Sub-components for article/paragraph rendering ── */

/**
 * Small helper: detect when a paragraph/article string is really a
 * markdown table (for example the APSAD D9A diagrams stored as
 * `content_markdown`) so the preview can render an actual table
 * instead of showing the raw markdown syntax.
 */
function looksLikeMarkdownTable(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("|") && trimmed.includes("|---");
}

/** Renders all paragraphs of an article (no specific highlight). */
function ArticleContent({
  article,
  onOpenImage,
}: {
  article: LawNode;
  onOpenImage: (img: { src: string; alt: string }) => void;
}) {
  const paragraphs =
    article.children?.filter((c) => c.kind === "paragraph") ?? [];

  if (paragraphs.length === 0 && article.content) {
    return (
      looksLikeMarkdownTable(article.content) ? (
        <div className="prose prose-xs max-w-none [&_table]:w-full [&_th]:bg-slate-100 [&_td]:align-top [&_td]:p-1">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {article.content}
        </p>
      )
    );
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para) => (
        <ParagraphBlock
          key={para.id}
          paragraph={para}
          highlighted={false}
          onOpenImage={onOpenImage}
        />
      ))}
    </div>
  );
}

/**
 * Renders the full article but visually highlights the target paragraph,
 * dimming the others so the user's eye is drawn to the relevant portion.
 */
function HighlightedParagraph({
  article,
  targetParagraph,
  onOpenImage,
}: {
  article: LawNode;
  targetParagraph: LawNode;
  onOpenImage: (img: { src: string; alt: string }) => void;
}) {
  const paragraphs =
    article.children?.filter((c) => c.kind === "paragraph") ?? [];

  if (paragraphs.length === 0) {
    return <ArticleContent article={article} onOpenImage={onOpenImage} />;
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para) => (
        <ParagraphBlock
          key={para.id}
          paragraph={para}
          highlighted={para.id === targetParagraph.id}
          dimmed={para.id !== targetParagraph.id}
          onOpenImage={onOpenImage}
        />
      ))}
    </div>
  );
}

/** A single paragraph block, optionally highlighted or dimmed. */
function ParagraphBlock({
  paragraph,
  highlighted,
  dimmed,
  onOpenImage,
}: {
  paragraph: LawNode;
  highlighted: boolean;
  dimmed?: boolean;
  onOpenImage: (img: { src: string; alt: string }) => void;
}) {
  return (
    <div
      className={[
        "rounded-lg border px-3 py-2 text-sm leading-relaxed transition-all",
        highlighted
          ? "border-blue-400 bg-blue-50/60 shadow-sm"
          : "border-border bg-card",
        dimmed ? "opacity-50" : "",
      ].join(" ")}
    >
      {paragraph.label && (
        <div className="mb-1 text-xs font-semibold text-slate-600">
          {paragraph.label}
        </div>
      )}
      {/* Mirror the main viewer behaviour for the two APSAD D9A diagrams:
         show the screenshots and make them clickable so users can open
         them in a larger view while staying inside the chat. */}
      {paragraph.id === "apsad-d9a-2.2-p5" && (
        <button
          type="button"
          onClick={() =>
            onOpenImage({
              src: "/guide_pratique_d9a_juin_2020_graph_1.jpeg",
              alt: "Tableau de calcul du volume à mettre en rétention (guide D9A)",
            })
          }
          className="mt-1 inline-block w-full cursor-zoom-in rounded-md border border-slate-200 bg-white p-2"
        >
          <img
            src="/guide_pratique_d9a_juin_2020_graph_1.jpeg"
            alt="Tableau de calcul du volume à mettre en rétention (guide D9A)"
            className="max-h-[320px] w-full max-w-full object-contain"
          />
        </button>
      )}

      {paragraph.id === "apsad-d9a-annexe-p11" && (
        <button
          type="button"
          onClick={() =>
            onOpenImage({
              src: "/guide_pratique_d9a_juin_2020_graph_2.jpeg",
              alt: "Tableau récapitulatif de l'exemple de calcul (annexe D9A)",
            })
          }
          className="mt-1 inline-block w-full cursor-zoom-in rounded-md border border-slate-200 bg-white p-2"
        >
          <img
            src="/guide_pratique_d9a_juin_2020_graph_2.jpeg"
            alt="Tableau récapitulatif de l'exemple de calcul (annexe D9A)"
            className="max-h-[320px] w-full max-w-full object-contain"
          />
        </button>
      )}

      {paragraph.content &&
        paragraph.id !== "apsad-d9a-2.2-p5" &&
        paragraph.id !== "apsad-d9a-annexe-p11" &&
        (looksLikeMarkdownTable(paragraph.content) ? (
          <div className="prose prose-xs max-w-none [&_table]:w-full [&_th]:bg-slate-100 [&_td]:align-top [&_td]:p-1">
            <ReactMarkdown>{paragraph.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {paragraph.content}
          </p>
        ))}
    </div>
  );
}

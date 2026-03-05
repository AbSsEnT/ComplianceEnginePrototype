import type { LawBook, LawNode } from "@/lib/law/types";

export interface Chunk {
  id: string;
  articleId: string;
  paragraphId?: string;
  text: string;
}

function textOf(node: LawNode): string {
  const parts: string[] = [node.label];
  if (node.heading) parts.push(node.heading);
  if (node.content) parts.push(node.content);
  return parts.join(" – ");
}

/**
 * Recursively collect chunks from a section or chapter: articles and their paragraphs.
 */
function collectChunksFromChildren(
  children: LawNode[],
  out: Chunk[],
): void {
  for (const node of children) {
    if (node.kind === "article") {
      const paragraphs = node.children?.filter((c) => c.kind === "paragraph") ?? [];
      if (paragraphs.length > 0) {
        const articlePrefix = textOf(node);
        for (const para of paragraphs) {
          const text = [articlePrefix, para.label, para.content ?? ""].filter(Boolean).join(" – ");
          out.push({
            id: para.id,
            articleId: node.id,
            paragraphId: para.id,
            text,
          });
        }
      } else if (node.content) {
        out.push({
          id: node.id,
          articleId: node.id,
          text: textOf(node),
        });
      }
    } else if (node.children?.length) {
      collectChunksFromChildren(node.children, out);
    }
  }
}

/**
 * Build RAG chunks from law books. A chunk is either a paragraph (with article context)
 * or an article with no children but with content.
 */
export function buildChunks(books: LawBook[]): Chunk[] {
  const out: Chunk[] = [];
  for (const book of books) {
    const chapters = book.children?.filter((c) => c.kind === "chapter") ?? [];
    for (const chapter of chapters) {
      collectChunksFromChildren(chapter.children ?? [], out);
    }
  }
  return out;
}

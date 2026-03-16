import type { LawBook, LawNode, LawSource } from "@/lib/law/types";
// Raw ERP and APSAD sources are stored under app/data/sources so that:
// - the same JSON trees can be reused by the library view, search and RAG;
// - embeddings can live separately under app/data/embeddings without mixing
//   raw content and derived artefacts.
import erpLivre1 from "./sources/erp/livre1.json";
import apsadD9aRaw from "./sources/apsad/guide_pratique_d9a_juin_2020.json";

/**
 * This file defines the high-level library organization shown in the UI.
 *
 * Why it exists:
 * - The application now has its own identity ("SafeLink").
 * - Regulatory documents are grouped by source (ERP, APSAD, EN/NF, ...).
 * - Each source can contain multiple books/codes.
 *
 * Notes:
 * - ERP Livre I is loaded directly from a JSON tree that already matches
 *   the generic `LawBook` / `LawNode` structure.
 * - The APSAD D9A guide uses a different JSON schema (`guide_pratique_d9a_juin_2020.json`);
 *   below we adapt it at runtime into the same hierarchical shape so that the
 *   Bibliothèque, search, bookmarks and chat source preview can all work
 *   without needing a separate rendering path.
 */

/**
 * Shape of the raw APSAD D9A JSON file.
 * Only the fields that are actually used by the adapter are declared here.
 */
interface ApsadD9aBlock {
  type: "paragraph" | "list" | "table";
  text?: string;
  items?: string[];
  content_markdown?: string;
}

interface ApsadD9aSection {
  id: string;
  title: string;
  level: number;
  blocks: ApsadD9aBlock[];
  subsections: ApsadD9aSection[];
}

interface ApsadD9aDocument {
  document_metadata: {
    title: string;
    date?: string;
  };
  sections: ApsadD9aSection[];
}

/**
 * Convert a list of APSAD "blocks" (paragraphs, lists, tables) into a list
 * of paragraph nodes compatible with the generic `LawNode` shape.
 *
 * Each block becomes a `paragraph` node so that:
 * - the chapter view (`ChapterContent`) can render them like ERP paragraphs;
 * - the search engine can match text at paragraph level.
 */
function apsadBlocksToParagraphs(
  articleId: string,
  blocks: ApsadD9aBlock[],
): LawNode[] {
  return blocks.map((block, index): LawNode => {
    const baseId = `${articleId}-p${index + 1}`;

    // Build a single plain-text string for the block.
    let content = "";
    if (block.type === "paragraph" && block.text) {
      content = block.text;
    } else if (block.type === "list" && block.items) {
      // Render bullet lists as one paragraph with line breaks so they stay readable
      // in the viewer and remain searchable as a single chunk.
      content = block.items.map((item) => `• ${item}`).join("\n");
    } else if (block.type === "table" && block.content_markdown) {
      // Keep the markdown table source as-is; the current viewer renders plain text,
      // but the raw content remains searchable and can be improved later.
      content = block.content_markdown;
    }

    return {
      id: baseId,
      kind: "paragraph",
      label: "",
      content,
    };
  });
}

/**
 * Recursively flattens APSAD sections + subsections into a list of `article`
 * nodes that all sit under a single logical chapter in the Bibliothèque.
 *
 * Design choice:
 * - We keep the navigation shallow for now: the whole D9A guide appears as
 *   one chapter ("Guide complet") and each section / subsection becomes an
 *   individual article within that chapter.
 */
function apsadSectionsToArticles(sections: ApsadD9aSection[]): LawNode[] {
  const articles: LawNode[] = [];

  const visit = (section: ApsadD9aSection) => {
    const articleId = `apsad-d9a-${section.id}`;

    const article: LawNode = {
      id: articleId,
      kind: "article",
      label: section.title,
      children: apsadBlocksToParagraphs(articleId, section.blocks ?? []),
    };

    articles.push(article);

    for (const sub of section.subsections ?? []) {
      visit(sub);
    }
  };

  for (const section of sections) {
    visit(section);
  }

  return articles;
}

/**
 * Adapter that turns the raw APSAD D9A JSON into a single `LawBook` with:
 * - one chapter ("Guide complet") so the UI has a stable navigation level;
 * - one article per section/subsection;
 * - one paragraph per block.
 */
function buildApsadD9aBook(raw: ApsadD9aDocument): LawBook {
  const title = raw.document_metadata?.title ?? "GUIDE PRATIQUE D9A";
  const date = raw.document_metadata?.date;

  const chapterChildren = apsadSectionsToArticles(raw.sections ?? []);

  const uniqueChapter: LawNode = {
    id: "apsad-d9a-chapitre-unique",
    kind: "chapter",
    label: "Guide complet D9A",
    heading: "Dimensionnement des rétentions des eaux d'extinction",
    children: chapterChildren,
  };

  return {
    id: "apsad-d9a",
    kind: "book",
    label: "Guide pratique D9A",
    heading: date ? `${title} (${date})` : title,
    children: [uniqueChapter],
  };
}
const erpBooks: LawBook[] = [
  ...(erpLivre1 as LawBook[]),
  {
    id: "erp-livre-2",
    kind: "book",
    label: "Livre II",
    heading: "Dispositions particulières (à intégrer).",
  },
  {
    id: "erp-livre-3",
    kind: "book",
    label: "Livre III",
    heading: "Dispositions techniques complémentaires (à intégrer).",
  },
  {
    id: "erp-livre-4",
    kind: "book",
    label: "Livre IV",
    heading: "Dispositions spécifiques supplémentaires (à intégrer).",
  },
];

// APSAD: build the D9A guide as a first concrete "livre" inside this source.
const apsadD9aBook: LawBook = buildApsadD9aBook(
  apsadD9aRaw as ApsadD9aDocument,
);

export const lawSources: LawSource[] = [
  {
    id: "erp-reglement-securite",
    label: "Reglement de securite ERP",
    description:
      "Corpus legal francais ERP organise en livres distincts (I a IV).",
    books: erpBooks,
  },
  {
    id: "apsad",
    label: "Regles APSAD",
    description:
      "Referentiels techniques assures par le CNPP (exemple initial: R1).",
    books: [apsadD9aBook],
  },
  {
    id: "en-nf",
    label: "Normes EN / NF",
    description:
      "Normes europeennes et transpositions francaises utiles aux projets.",
    books: [
      {
        id: "en-nf-codes",
        kind: "book",
        label: "Corpus EN / NF",
        heading: "Normes harmonisees et versions francaises (a integrer).",
      },
    ],
  },
];


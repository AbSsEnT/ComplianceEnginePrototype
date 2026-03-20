/**
 * Convert a FM Global "atomic_nodes" JSON export into the app's LawBook / LawNode tree.
 *
 * Input:
 *   app/data/FMDS0200-001-013.json
 *
 * Output:
 *   app/data/sources/fm-global/FMDS0200-001-013.json  (LawBook shape)
 *
 * Goals:
 * - Preserve "atomic splits": every paragraph/list_item becomes one LawNode of kind "paragraph"
 *   with the same stable id (node_id from the atomic export).
 * - Preserve header structure: every breadcrumb element becomes a container.
 *   - all but the last breadcrumb element -> nested LawNode kind "section"
 *   - last breadcrumb element -> LawNode kind "article"
 * - Preserve list look: list_item is displayed with a leading bullet when it doesn't already
 *   look like an enumerated letter/number (A., 1., etc.).
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const INPUT_PATH = join(ROOT, "app", "data", "FMDS0200-001-013.json");
const OUTPUT_DIR = join(ROOT, "app", "data", "sources", "fm-global");
const OUTPUT_PATH = join(OUTPUT_DIR, "FMDS0200-001-013.json");

function parseBreadcrumbElement(element) {
  // Expected shape: "<numbering> <title...>"
  // Example: "2.2.1.3.5 Recommended Sprinkler System Design and Hydraulic Calculations"
  const trimmed = String(element ?? "").trim();
  if (!trimmed) return { numbering: "", title: "" };

  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)*)(?:\s+)(.+)$/);
  if (match) {
    return { numbering: match[1], title: match[2] };
  }

  // Fallback: keep the whole string as an id.
  return { numbering: trimmed, title: "" };
}

function shouldPrefixBullet(content) {
  const s = String(content ?? "").trim();
  if (!s) return false;

  // If the content already starts with an enumerated marker, don't add an extra bullet.
  // Examples observed in FM exports:
  // - "A. The guidelines..."
  // - "B. Editorial changes..."
  // - "- ..." (rare but possible)
  if (/^[A-Z]\.\s+/.test(s)) return false;
  if (/^[0-9]+\.\s+/.test(s)) return false;
  if (/^[-*]\s+/.test(s)) return false;
  if (/^•\s+/.test(s)) return false;

  return true;
}

function listItemToDisplayContent(content) {
  const s = String(content ?? "");
  return shouldPrefixBullet(s) ? `• ${s}` : s;
}

/**
 * Create a tree that matches LawNode expectations:
 * - sections can contain nested sections and articles
 * - articles contain paragraph nodes
 */
function buildLawBookFromFmAtomic(raw) {
  const atomicNodes = Array.isArray(raw?.atomic_nodes) ? raw.atomic_nodes : [];

  const bookId = "fm-global-fmds-2-0";
  const chapterId = `${bookId}-chapter`;

  const lawBook = {
    id: bookId,
    kind: "book",
    label: "FM Global",
    heading: "Property Loss Prevention Data Sheet",
    children: [
      {
        id: chapterId,
        kind: "chapter",
        // Display name shown in the UI when the user opens the chapter.
        label: (() => {
          const base =
            raw?.document_id && String(raw.document_id).trim()
              ? String(raw.document_id).replace(/_/g, " ")
              : "FM Global";

          // For this specific FM atomic export, the PDF title is expected to be:
          // "FM 2-0 Installation Guidelines for Automatic Sprinklers".
          if (base === "FM 2-0") {
            return "FM 2-0 Installation Guidelines for Automatic Sprinklers";
          }

          return base;
        })(),
        heading: undefined,
        children: [],
      },
    ],
  };

  const chapter = lawBook.children[0];
  const chapterChildren = chapter.children;

  /**
   * Some breadcrumb elements act both as:
   * - a parent heading (there are deeper breadcrumb levels under them), and
   * - a leaf heading (there are atomic nodes whose breadcrumbs end there).
   *
   * If we always treat the final breadcrumb element as an "article", we can end up
   * rendering the same heading twice (once as an article and once as a section).
   *
   * To avoid that, we precompute which breadcrumb prefixes must be rendered as
   * "sections" (parents), then if a leaf breadcrumb is also a parent we store its
   * paragraph/list content inside a dedicated "-content" article under that section.
   */
  const breadcrumbPrefixKey = (breadcrumbs, endExclusive) =>
    String(breadcrumbs.slice(0, endExclusive)).replaceAll(",", " > ");

  const sectionPrefixKeys = new Set();
  for (const node of atomicNodes) {
    const breadcrumbs = Array.isArray(node?.breadcrumbs) ? node.breadcrumbs : [];
    for (let i = 0; i < breadcrumbs.length - 1; i++) {
      // i is a non-last element => it must be a section container.
      sectionPrefixKeys.add(breadcrumbPrefixKey(breadcrumbs, i + 1));
    }
  }

  function findChild(arr, kind, id) {
    return (arr ?? []).find((n) => n.kind === kind && n.id === id);
  }

  function ensureSection(parentChildren, sectionElement) {
    const { numbering, title } = parseBreadcrumbElement(sectionElement);
    const sectionId = numbering;
    const existing = findChild(parentChildren, "section", sectionId);
    if (existing) return existing;

    const sectionNode = {
      id: sectionId,
      kind: "section",
      label: numbering,
      heading: title || undefined,
      children: [],
    };

    parentChildren.push(sectionNode);
    return sectionNode;
  }

  function ensureArticle(parentChildren, articleElement) {
    const { numbering } = parseBreadcrumbElement(articleElement);
    const articleId = numbering;
    const existing = findChild(parentChildren, "article", articleId);
    if (existing) return existing;

    const articleNode = {
      id: articleId,
      kind: "article",
      // ArticleBlock shows label as-is; we want close-to-pdf text.
      label: String(articleElement ?? ""),
      children: [],
    };

    parentChildren.push(articleNode);
    return articleNode;
  }

  function ensureContentArticleUnderSection(sectionNode, articleElement) {
    const { numbering } = parseBreadcrumbElement(articleElement);
    const articleId = `${numbering}-content`;

    const existing = findChild(sectionNode.children, "article", articleId);
    if (existing) return existing;

    const articleNode = {
      id: articleId,
      kind: "article",
      label: String(articleElement ?? ""),
      children: [],
    };

    sectionNode.children.push(articleNode);
    return articleNode;
  }

  for (const node of atomicNodes) {
    const breadcrumbs = Array.isArray(node?.breadcrumbs) ? node.breadcrumbs : [];
    if (breadcrumbs.length === 0) continue;

    const lastIndex = breadcrumbs.length - 1;

    // 1) Build containers
    let currentChildren = chapterChildren;
    for (let i = 0; i < lastIndex; i++) {
      const sectionEl = breadcrumbs[i];
      const sectionNode = ensureSection(currentChildren, sectionEl);
      currentChildren = sectionNode.children;
    }

    // 2) Deepest breadcrumb becomes the "article"
    const leafEl = breadcrumbs[lastIndex];
    const leafPrefixKey = breadcrumbPrefixKey(breadcrumbs, lastIndex + 1);
    const leafIsAlsoSection = sectionPrefixKeys.has(leafPrefixKey);

    // Headings are containers; paragraphs/list_items are the actual content.
    const leafNodeType = node?.node_type;

    // 3) Add content
    if (node?.node_type === "heading") {
      continue;
    }

    if (leafIsAlsoSection) {
      // Render the leaf heading as a section, and put the actual content under
      // a dedicated article node inside it.
      const leafSectionNode = ensureSection(currentChildren, leafEl);
      const contentArticle = ensureContentArticleUnderSection(
        leafSectionNode,
        leafEl,
      );

      if (leafNodeType === "paragraph") {
        contentArticle.children.push({
          id: String(node.node_id ?? ""),
          kind: "paragraph",
          label: "",
          content: String(node.content ?? ""),
        });
        continue;
      }

      if (leafNodeType === "list_item") {
        contentArticle.children.push({
          id: String(node.node_id ?? ""),
          kind: "paragraph",
          label: "",
          content: listItemToDisplayContent(node.content),
        });
        continue;
      }
    } else {
      // Standard case: leaf breadcrumb maps directly to an article.
      const articleNode = ensureArticle(currentChildren, leafEl);

      if (leafNodeType === "paragraph") {
        articleNode.children.push({
          id: String(node.node_id ?? ""),
          kind: "paragraph",
          label: "",
          content: String(node.content ?? ""),
        });
        continue;
      }

      if (leafNodeType === "list_item") {
        articleNode.children.push({
          id: String(node.node_id ?? ""),
          kind: "paragraph",
          label: "",
          content: listItemToDisplayContent(node.content),
        });
        continue;
      }
    }
  }

  return lawBook;
}

function main() {
  const raw = JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
  const lawBook = buildLawBookFromFmAtomic(raw);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(lawBook, null, 2), "utf-8");

  console.log(
    `Converted FM atomic_nodes -> LawBook.\nInput: ${INPUT_PATH}\nOutput: ${OUTPUT_PATH}`,
  );
}

main();


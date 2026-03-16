/**
 * Pre-compute embeddings for the APSAD guide "D9A" using Azure OpenAI
 * text-embedding-3-large.
 *
 * Design:
 * - We adapt the raw D9A JSON (sections + blocks) into the generic LawBook /
 *   LawNode shape, mirroring the logic used in the UI (libraryCatalog.ts).
 * - Each section / subsection becomes an "article", and each block becomes a
 *   "paragraph" node so that search and chat can reason at paragraph level.
 * - The resulting chunks are embedded and written to a dedicated file:
 *   app/data/embeddings/apsad-d9a.embeddings.json
 *
 * Run (after configuring your .env):
 *   pnpm tsx scripts/embed-apsad-d9a.ts
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { buildChunks } from "../lib/rag/chunks";
import type { LawBook, LawNode } from "../lib/law/types";

const BATCH_SIZE = 100;

/**
 * Minimal TypeScript view of the raw APSAD D9A JSON file.
 * Only the fields we actually need are declared here.
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
 * This mirrors the adapter used in the UI so that paragraph IDs and content
 * stay consistent between the Bibliothèque and the RAG index.
 */
function apsadBlocksToParagraphs(
  articleId: string,
  blocks: ApsadD9aBlock[],
): LawNode[] {
  return blocks.map((block, index): LawNode => {
    const baseId = `${articleId}-p${index + 1}`;

    let content = "";
    if (block.type === "paragraph" && block.text) {
      content = block.text;
    } else if (block.type === "list" && block.items) {
      content = block.items.map((item) => `• ${item}`).join("\n");
    } else if (block.type === "table" && block.content_markdown) {
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
 * Recursively flatten APSAD sections + subsections into a list of "article"
 * nodes that all sit under a single logical chapter in the Bibliothèque.
 *
 * Each section / subsection becomes one article containing its paragraph blocks.
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
 * Build a LawBook instance for the APSAD D9A guide so it can be fed into the
 * generic chunk builder used by the chat RAG pipeline.
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

async function main() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;

  if (!apiKey || !endpoint || !deployment) {
    console.error(
      "Missing env: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT",
    );
    process.exit(1);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const projectRoot = join(__dirname, "..");

  // Raw APSAD D9A JSON as exported from app/data.
  const dataPath = join(
    projectRoot,
    "app",
    "data",
    "sources",
    "apsad",
    "guide_pratique_d9a_juin_2020.json",
  );
  // Per-livre embeddings for APSAD D9A.
  const outPath = join(
    projectRoot,
    "app",
    "data",
    "embeddings",
    "apsad-d9a.embeddings.json",
  );

  const raw = readFileSync(dataPath, "utf-8");
  const doc = JSON.parse(raw) as ApsadD9aDocument;
  const apsadBook = buildApsadD9aBook(doc);
  const chunks = buildChunks([apsadBook as LawBook]);
  console.log(`Built ${chunks.length} chunks from APSAD D9A`);

  const client = new OpenAI({
    apiKey,
    baseURL: `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}`,
    defaultQuery: { "api-version": "2024-02-01" },
  });

  const chunksWithEmbeddings: Array<
    (typeof chunks)[0] & { embedding: number[] }
  > = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const res = await client.embeddings.create({
      model: deployment,
      input: texts,
    });
    for (let j = 0; j < batch.length; j++) {
      const embedding = res.data[j]?.embedding;
      if (!embedding) {
        throw new Error(`Missing embedding for chunk ${batch[j].id}`);
      }
      chunksWithEmbeddings.push({ ...batch[j], embedding });
    }
    console.log(
      `Embedded ${Math.min(i + BATCH_SIZE, chunks.length)} / ${chunks.length}`,
    );
  }

  const output = {
    model: "text-embedding-3-large",
    deployment,
    chunks: chunksWithEmbeddings,
  };
  writeFileSync(outPath, JSON.stringify(output, null, 0), "utf-8");
  console.log(`Wrote ${chunksWithEmbeddings.length} chunk embeddings to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


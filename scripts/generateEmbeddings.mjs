/**
 * generateEmbeddings.mjs
 *
 * Reads the ERP law JSON data, splits it into article/paragraph chunks,
 * calls Azure OpenAI to embed each chunk, and writes the result to
 * app/data/embeddings.json for the RAG chat API.
 *
 * Usage:  node scripts/generateEmbeddings.mjs
 *
 * Requires .env with:
 *   AZURE_OPENAI_API_KEY
 *   AZURE_OPENAI_ENDPOINT
 *   AZURE_OPENAI_EMBEDDING_DEPLOYMENT
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env manually (no dotenv dependency needed) ──
const envPath = join(ROOT, ".env");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const match = line.match(/^(\w+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
const DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;

if (!API_KEY || !ENDPOINT || !DEPLOYMENT) {
  console.error("Missing Azure OpenAI env vars. Check your .env file.");
  process.exit(1);
}

const DATA_PATH = join(ROOT, "app", "data", "erp_livre1.json");
const OUTPUT_PATH = join(ROOT, "app", "data", "embeddings.json");

// ── Read and chunk the law data ──

const books = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

/** Recursively extract text chunks from the law tree. */
function extractChunks(nodes, chunks = []) {
  if (!nodes) return chunks;
  for (const node of nodes) {
    if (node.kind === "article") {
      // If the article has direct content (no paragraph children), chunk it
      if (node.content) {
        chunks.push({
          id: node.id,
          articleId: node.id,
          text: `${node.label}${node.heading ? " — " + node.heading : ""}: ${node.content}`,
        });
      }
      // Also chunk each paragraph
      if (node.children) {
        for (const child of node.children) {
          if (child.kind === "paragraph" && child.content) {
            chunks.push({
              id: child.id,
              articleId: node.id,
              paragraphId: child.id,
              text: `${node.label} ${child.label}${node.heading ? " (" + node.heading + ")" : ""}: ${child.content}`,
            });
          }
        }
      }
    }
    // Recurse into sections, chapters, etc.
    if (node.children) {
      extractChunks(node.children, chunks);
    }
  }
  return chunks;
}

const chunks = extractChunks(books);
console.log(`Found ${chunks.length} chunks to embed.`);

// ── Call Azure OpenAI Embeddings API ──

const BATCH_SIZE = 16; // Azure allows batch embedding
const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/embeddings?api-version=2024-02-01`;

async function embedBatch(texts) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify({ input: texts }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

async function main() {
  const results = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    console.log(
      `Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)...`
    );

    const embeddings = await embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        id: batch[j].id,
        articleId: batch[j].articleId,
        paragraphId: batch[j].paragraphId,
        text: batch[j].text,
        embedding: embeddings[j],
      });
    }
  }

  const output = { chunks: results };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output), "utf-8");
  console.log(`\nDone! Wrote ${results.length} embeddings to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

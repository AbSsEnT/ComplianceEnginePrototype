/**
 * Pre-compute embeddings for law chunks of ERP Livre I using Azure OpenAI
 * text-embedding-3-large.
 *
 * This script is intentionally scoped to a single "livre" so that:
 * - each réglementaire corpus can have its own embedding file; and
 * - the chat backend can later filter or combine sources as needed.
 *
 * Run: pnpm embed
 * Requires: .env with AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { buildChunks } from "../lib/rag/chunks";
import type { LawBook } from "../lib/law/types";

const BATCH_SIZE = 100;

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
  // Path to the raw ERP Livre I JSON tree used by the library view.
  const dataPath = join(
    projectRoot,
    "app",
    "data",
    "sources",
    "erp",
    "livre1.json",
  );
  // Per-livre embeddings are written under app/data/embeddings so multiple
  // corpora can be indexed independently (ERP, APSAD, EN/NF, ...).
  const outPath = join(
    projectRoot,
    "app",
    "data",
    "embeddings",
    "erp-livre1.embeddings.json",
  );

  const raw = readFileSync(dataPath, "utf-8");
  const books = JSON.parse(raw) as LawBook[];
  const chunks = buildChunks(books);
  console.log(`Built ${chunks.length} chunks from ERP Livre I`);

  const client = new OpenAI({
    apiKey,
    baseURL: `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}`,
    defaultQuery: { "api-version": "2024-02-01" },
  });

  const chunksWithEmbeddings: Array<(typeof chunks)[0] & { embedding: number[] }> = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const res = await client.embeddings.create({
      model: deployment,
      input: texts,
    });
    for (let j = 0; j < batch.length; j++) {
      const embedding = res.data[j]?.embedding;
      if (!embedding) throw new Error(`Missing embedding for chunk ${batch[j].id}`);
      chunksWithEmbeddings.push({ ...batch[j], embedding });
    }
    console.log(`Embedded ${Math.min(i + BATCH_SIZE, chunks.length)} / ${chunks.length}`);
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

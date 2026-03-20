/**
 * Pre-compute embeddings for the BayBO fire-safety subset book (`baybo-brand`)
 * so that the chat RAG pipeline can answer questions grounded in these articles.
 *
 * Input:
 *   app/data/sources/baybo/baybo-brand.json  (already matches LawBook shape)
 *
 * Output:
 *   app/data/embeddings/baybo-brand.embeddings.json
 *
 * Run (after configuring your .env):
 *   pnpm tsx scripts/embed-baybo-brand.ts
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

  // Raw BayBO subset JSON as exported from app/data.
  const dataPath = join(
    projectRoot,
    "app",
    "data",
    "sources",
    "baybo",
    "baybo-brand.json",
  );
  // Per-book embeddings for BayBO fire-safety subset.
  const outPath = join(
    projectRoot,
    "app",
    "data",
    "embeddings",
    "baybo-brand.embeddings.json",
  );

  const raw = readFileSync(dataPath, "utf-8");
  const book = JSON.parse(raw) as LawBook;
  const chunks = buildChunks([book]);
  console.log(`Built ${chunks.length} chunks from baybo-brand`);

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
  console.log(
    `Wrote ${chunksWithEmbeddings.length} chunk embeddings to ${outPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


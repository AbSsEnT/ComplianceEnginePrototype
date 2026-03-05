import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import type { GroundedPart } from "@/lib/law/types";

const TOP_K = 8;
const EMBEDDINGS_PATH = join(process.cwd(), "app", "data", "embeddings.json");

type ChunkWithEmbedding = {
  id: string;
  articleId: string;
  paragraphId?: string;
  text: string;
  embedding: number[];
};

type EmbeddingsData = {
  chunks: ChunkWithEmbedding[];
};

let cachedEmbeddings: EmbeddingsData | null = null;

function loadEmbeddings(): EmbeddingsData {
  if (cachedEmbeddings) return cachedEmbeddings;
  const raw = readFileSync(EMBEDDINGS_PATH, "utf-8");
  cachedEmbeddings = JSON.parse(raw) as EmbeddingsData;
  return cachedEmbeddings;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function buildContext(chunks: ChunkWithEmbedding[]): string {
  return chunks
    .map(
      (c) =>
        `[Article ${c.articleId}]${c.paragraphId ? ` [Paragraph ${c.paragraphId}]` : ""} ${c.text}`,
    )
    .join("\n\n");
}

function parsePartsJson(raw: string): GroundedPart[] {
  let json = raw.trim();
  const fence = json.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence) json = fence[1].trim();
  const parsed = JSON.parse(json) as { parts?: unknown };
  if (!Array.isArray(parsed.parts)) throw new Error("Missing or invalid parts array");
  return parsed.parts.map((p: unknown) => {
    if (typeof p !== "object" || p === null) throw new Error("Invalid part");
    const o = p as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : String(o.text ?? "");
    const articleId = typeof o.articleId === "string" ? o.articleId : undefined;
    const paragraphId = typeof o.paragraphId === "string" ? o.paragraphId : undefined;
    return { text, articleId, paragraphId };
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4.1-mini";

  if (!apiKey || !endpoint) {
    return Response.json(
      { error: "Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT" },
      { status: 500 },
    );
  }
  if (!embeddingDeployment) {
    return Response.json(
      { error: "Missing AZURE_OPENAI_EMBEDDING_DEPLOYMENT" },
      { status: 500 },
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "Missing or empty message" }, { status: 400 });
  }

  try {
    const { chunks } = loadEmbeddings();
    if (!chunks?.length) {
      return Response.json(
        { error: "No embeddings loaded" },
        { status: 500 },
      );
    }

    const embeddingClient = new OpenAI({
      apiKey,
      baseURL: `${endpoint.replace(/\/$/, "")}/openai/deployments/${embeddingDeployment}`,
      defaultQuery: { "api-version": "2024-02-01" },
    });
    const embedRes = await embeddingClient.embeddings.create({
      model: embeddingDeployment,
      input: message,
    });
    const queryEmbedding = embedRes.data[0]?.embedding;
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return Response.json(
        { error: "Failed to embed query" },
        { status: 500 },
      );
    }

    const scored = chunks.map((c) => ({
      chunk: c,
      score: dotProduct(queryEmbedding, c.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, TOP_K).map((s) => s.chunk);
    const context = buildContext(topChunks);

    const chatClient = new OpenAI({
      apiKey,
      baseURL: `${endpoint.replace(/\/$/, "")}/openai/deployments/${chatDeployment}`,
      defaultQuery: { "api-version": "2024-02-01" },
    });

    const systemContent = `Tu es un assistant qui répond UNIQUEMENT à partir des extraits du règlement ERP ci-dessous.
Réponds en français. Pour chaque phrase ou segment de ta réponse, cite l'article (et le paragraphe le cas échéant) qui le justifie.
Réponds UNIQUEMENT au format JSON suivant, sans texte avant ou après :
{"parts":[{"text":"...","articleId":"GN-1","paragraphId":"GN-1-1"},...]}
- Chaque élément de "parts" contient "text" (une phrase ou court segment) et optionnellement "articleId" et "paragraphId" pour la citation.
- Si l'information n'est pas dans les extraits, renvoie un seul part avec "text" explicatif et sans articleId/paragraphId.

Extraits du règlement :
${context}`;

    const completion = await chatClient.chat.completions.create({
      model: chatDeployment,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: message },
      ],
      temperature: 0.2,
      seed: 0,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return Response.json(
        { error: "Empty model response" },
        { status: 500 },
      );
    }

    let parts: GroundedPart[];
    try {
      parts = parsePartsJson(rawContent);
    } catch (parseErr) {
      console.error("Chat response parse error:", parseErr);
      parts = [{ text: rawContent }];
    }

    return Response.json({ parts });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json(
      { error: "Erreur lors de la génération de la réponse." },
      { status: 500 },
    );
  }
}

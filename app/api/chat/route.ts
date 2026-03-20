import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import type { GroundedPart } from "@/lib/law/types";

const TOP_K = 8;

/**
 * Mapping between logical "livres" (as used by the library / search views)
 * and the corresponding embedding files on disk.
 *
 * This lets the chat route:
 * - include only a subset of corpora (e.g. ERP only, sans APSAD);
 * - keep embeddings per-livre, which is easier to regenerate and debug.
 *
 * Keys here should match `LawBook["id"]` values coming from `lawSources`.
 */
const BOOK_EMBEDDING_FILES = {
  "livre-1": join(
    process.cwd(),
    "app",
    "data",
    "embeddings",
    "erp-livre1.embeddings.json",
  ),
  "apsad-d9a": join(
    process.cwd(),
    "app",
    "data",
    "embeddings",
    "apsad-d9a.embeddings.json",
  ),
  "baybo-brand": join(
    process.cwd(),
    "app",
    "data",
    "embeddings",
    "baybo-brand.embeddings.json",
  ),
} as const;
type BookKey = keyof typeof BOOK_EMBEDDING_FILES;

type ChunkWithEmbedding = {
  id: string;
  articleId: string;
  paragraphId?: string;
  text: string;
  embedding: number[];
};

/**
 * Simple in-memory cache so we only parse each embeddings file once.
 * The cache is keyed by the embedding file path.
 */
const fileCache: Record<string, ChunkWithEmbedding[] | undefined> = {};

/**
 * Load embeddings for the requested books (livres).
 *
 * - `selectedBooks` is a list of LawBook IDs (e.g. "livre-1", "apsad-d9a").
 * - If it is `undefined` or empty, we fall back to "all known books".
 * - Unknown IDs are ignored gracefully so the API stays robust.
 */
function loadChunksForBooks(selectedBooks?: BookKey[]): ChunkWithEmbedding[] {
  const allBookKeys = Object.keys(BOOK_EMBEDDING_FILES) as BookKey[];
  const effectiveBooks =
    selectedBooks && selectedBooks.length > 0 ? selectedBooks : allBookKeys;

  const chunks: ChunkWithEmbedding[] = [];

  for (const bookId of effectiveBooks) {
    const path = BOOK_EMBEDDING_FILES[bookId];
    if (!path) continue;

    if (!fileCache[path]) {
      try {
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw) as {
          chunks?: ChunkWithEmbedding[];
        };
        fileCache[path] = Array.isArray(parsed.chunks)
          ? parsed.chunks
          : [];
      } catch (err) {
        console.error(`Failed to load embeddings file at ${path}:`, err);
        fileCache[path] = [];
      }
    }

    chunks.push(...(fileCache[path] ?? []));
  }

  return chunks;
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

  let body: { message?: string; books?: string[]; locale?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "Missing or empty message" }, { status: 400 });
  }
  const uiLocale = body.locale === "de" ? "de" : "fr";

  try {
    // Normalise and validate requested books so the client can send arbitrary
    // values without risking a server error.
    const requestedBooksRaw = Array.isArray(body.books) ? body.books : undefined;
    const requestedBookKeys: BookKey[] | undefined = requestedBooksRaw
      ?.map((b) => b as BookKey)
      .filter((b): b is BookKey => b in BOOK_EMBEDDING_FILES);

    const chunks = loadChunksForBooks(requestedBookKeys);
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

    const systemContent = `Tu es l'assistant SafeLink. Tu reponds UNIQUEMENT a partir des extraits reglementaires ci-dessous.
Réponds en ${uiLocale === "de" ? "allemand (Deutsch)" : "français"}.

Règles strictes :
1. Pertinence : avant d'inclure un extrait, vérifie qu'il répond DIRECTEMENT à la question. Si un passage du contexte ne concerne pas la question, ignore-le complètement. Le contexte contient des passages récupérés automatiquement — beaucoup ne sont pas pertinents.
2. Concision : ne cite pas un paragraphe ou article en entier. Extrais uniquement la partie qui répond à la question. Tu peux reformuler pour ne garder que l'essentiel.
3. Regroupement : si plusieurs éléments de ta réponse proviennent du même article ou paragraphe, regroupe-les dans un seul part. Ne répète pas la même référence dans des parts consécutifs.
4. Références uniques : chaque part ne doit contenir qu'UN SEUL articleId et UN SEUL paragraphId. Si un passage de ta réponse s'appuie sur plusieurs références, découpe-le en autant de parts qu'il y a de références distinctes. Ne mets jamais plusieurs IDs séparés par des virgules dans un champ.
5. Formatage du champ "text" : utilise du Markdown (listes à puces, **gras**, retours à la ligne) pour structurer la réponse quand c'est pertinent.

Réponds UNIQUEMENT au format JSON suivant, sans texte avant ou après :
{"parts":[{"text":"...","articleId":"GN-1","paragraphId":"GN-1-1"},...]}
- "text" : le contenu (en Markdown si utile), concis et pertinent.
- "articleId" et "paragraphId" : optionnels, la source de ce passage. Un seul ID par champ, jamais plusieurs.
- Si l'information n'est pas dans les extraits, renvoie un seul part explicatif sans articleId/paragraphId.

Extraits reglementaires :
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

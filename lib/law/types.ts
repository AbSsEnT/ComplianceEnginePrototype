export type LawKind = "book" | "chapter" | "section" | "article" | "paragraph";

export interface LawNode {
  id: string;
  kind: LawKind;
  label: string;
  heading?: string;
  articlesRange?: string;
  content?: string;
  children?: LawNode[];
}

export interface LawBook extends LawNode {
  kind: "book";
}

/**
 * A source groups books that come from the same regulatory family
 * (for example: ERP, APSAD, EN/NF).
 */
export interface LawSource {
  id: string;
  label: string;
  description?: string;
  books: LawBook[];
}

export interface LawReference {
  articleId: string;
  paragraphId?: string;
}

/** A segment of the model response with optional grounding in an article/paragraph */
export interface GroundedPart {
  text: string;
  articleId?: string;
  paragraphId?: string;
}

export type ChatSender = "user" | "bot";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  references?: LawReference[];
  /** When present, render as text + inline ref link per part (RAG response) */
  parts?: GroundedPart[];
}



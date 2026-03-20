// Supported jurisdictions for regulatory sources.
export type JurisdictionCode = "FR" | "DE" | "EU";

// High-level families / issuers of standards.
export type StandardBody =
  | "ERP"
  | "APSAD"
  | "EN_NF"
  | "DIN"
  | "VDS"
  | "BAUORDNUNG"
  | "OTHER";

// Coarse-grained categories used to group sources in the library UI.
export type SourceType =
  | "LAW_AND_CODE" // statutory law, regulations, building codes
  | "STANDARD" // EN / DIN / NF / ISO style norms
  | "INSURER_STANDARD" // APSAD, VdS, CNPP, etc.
  | "GUIDE"; // practical guides, handbooks, commentary

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
  /**
   * Stable identifier for this logical source as it appears in the UI
   * (for example: "erp-reglement-securite", "vds").
   */
  id: string;
  /**
   * Human‑readable label for the source, shown in the library tiles.
   * This is currently stored per‑source instead of being fully localized.
   */
  label: string;
  /** Short description of the scope / content of this source. */
  description?: string;
  /**
   * High-level category of this source used for grouping in the library view.
   * This sits above `standardBody` so that, for example, BayBO and ERP are both
   * treated as "laws / codes", while DIN and EN are "standards".
   */
  sourceType: SourceType;
  /**
   * Country / region where this source is primarily applicable.
   * Used by the library to let users filter French vs German vs EU texts.
   */
  jurisdiction: JurisdictionCode;
  /**
   * High‑level family or issuer of this source (ERP, APSAD, DIN, VdS, etc.).
   * This lets the library group similar standards together.
   */
  standardBody: StandardBody;
  /**
   * Language of the underlying document text.
   * The UI language is handled separately by the i18n layer.
   */
  documentLanguage: "fr" | "de";
  /**
   * Logical "books" / codes that belong to this source.
   */
  books: LawBook[];
  /**
   * Optional localized display label and description for non-French UI
   * languages. For now only German is supported; `label` / `description`
   * act as French defaults.
   */
  labelDe?: string;
  descriptionDe?: string;
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

/** ChatMessage with a creation timestamp, used by the UI layer. */
export interface TimestampedChatMessage extends ChatMessage {
  ts: number;
}

/** A saved bookmark pointing to an article or paragraph. */
export interface BookmarkEntry {
  key: string;
  articleId: string;
  paragraphId?: string;
  sourceId: string;
  bookId: string;
  chapterId: string;
  title: string;
  excerpt: string;
  createdAt: number;
}

/** Tracks a recently visited book for the home dashboard. */
export interface RecentBookVisit {
  sourceId: string;
  sourceLabel: string;
  bookId: string;
  bookLabel: string;
  heading?: string;
  visitedAt: number;
}

/** A full chat conversation containing messages and metadata. */
export interface ChatConversation {
  id: string;
  /** Short title derived from the first user message. */
  title: string;
  messages: TimestampedChatMessage[];
  createdAt: number;
  updatedAt: number;
}



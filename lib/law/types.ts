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

export interface LawReference {
  articleId: string;
  paragraphId?: string;
}

export type ChatSender = "user" | "bot";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  references?: LawReference[];
}



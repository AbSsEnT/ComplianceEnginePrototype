"use client";

/**
 * ChatView — a dedicated full-screen chat experience (ChatGPT-style).
 *
 * Layout:
 *  - Left sidebar (~300px): conversation history list with titles, dates,
 *    and referenced documents. "New chat" button at top.
 *  - Main area: active conversation with messages, input, and animations.
 *
 * Conversations and the active ID are managed by the parent (`page.tsx`)
 * and passed in as props so state persists across view switches.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type {
  ChatConversation,
  GroundedPart,
  LawReference,
  TimestampedChatMessage,
} from "@/lib/law/types";
import {
  Plus,
  Send,
  FileText,
  Calendar,
  MessageSquare,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import WaterDropMascot from "./WaterDropMascot";

/* ── Public props ── */

interface ChatViewProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  /** Accepts both a direct value and a functional updater to avoid stale closures. */
  onConversationsChange: React.Dispatch<React.SetStateAction<ChatConversation[]>>;
  onActiveConversationIdChange: (id: string | null) => void;
}

/* ── Helpers ── */

function timeAgoShort(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  return `${months} mois`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Extracts unique article/paragraph references from all bot messages. */
function extractReferences(messages: TimestampedChatMessage[]): string[] {
  const refs = new Set<string>();
  for (const msg of messages) {
    if (msg.sender !== "bot") continue;
    if (msg.parts) {
      for (const part of msg.parts) {
        if (part.articleId) {
          const articleIds = part.articleId.split(/[,;]\s*/).filter(Boolean);
          for (const aid of articleIds) refs.add(`Art. ${aid}`);
        }
        if (part.paragraphId) {
          const paraIds = part.paragraphId.split(/[,;]\s*/).filter(Boolean);
          for (const pid of paraIds) refs.add(`§ ${pid}`);
        }
      }
    }
    if (msg.references) {
      for (const ref of msg.references) {
        if (ref.paragraphId) refs.add(`§ ${ref.paragraphId}`);
        else refs.add(`Art. ${ref.articleId}`);
      }
    }
  }
  return Array.from(refs).slice(0, 5);
}

/** Derives a conversation title from the first user message. */
function deriveTitle(messages: TimestampedChatMessage[]): string {
  const firstUser = messages.find((m) => m.sender === "user");
  if (!firstUser) return "Nouvelle conversation";
  const text = firstUser.text.trim();
  if (text.length <= 50) return text;
  return text.slice(0, 47) + "…";
}

function buildRefs(part: GroundedPart): LawReference[] {
  const articleIds = (part.articleId ?? "").split(/[,;]\s*/).filter(Boolean);
  const paragraphIds = (part.paragraphId ?? "").split(/[,;]\s*/).filter(Boolean);
  if (paragraphIds.length > 0) {
    return paragraphIds.map((pid) => ({
      articleId: articleIds[0] ?? pid.replace(/-\d+$/, ""),
      paragraphId: pid,
    }));
  }
  return articleIds.map((aid) => ({ articleId: aid }));
}

/** Pre-built prompts shown in the empty state so users can start with one click. */
const SUGGESTION_CHIPS = [
  "Quelles sont les règles de désenfumage pour les ERP ?",
  "Résumez les obligations de sécurité du Livre 1",
  "Quels articles traitent des issues de secours ?",
];

/** Returns a French date-group label for conversation sidebar grouping. */
function dateGroupLabel(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return "Cette semaine";
  if (diffDays < 30) return "Ce mois";
  return "Plus ancien";
}

/** Animated three-dot typing indicator used in place of a spinner. */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-blue-500"
          style={{ animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  );
}

/* ── Main component ── */

export default function ChatView({
  conversations,
  activeConversationId,
  onConversationsChange,
  onActiveConversationIdChange,
}: ChatViewProps) {
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );
  const messages = activeConversation?.messages ?? [];

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  /** Resolve the actual scrollable viewport inside the ScrollArea wrapper. */
  const getViewport = useCallback(
    () =>
      scrollAreaRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      ) ?? scrollAreaRef.current,
    [],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Auto-scroll on new messages (only if already near bottom)
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    const nearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 120;
    if (nearBottom) vp.scrollTop = vp.scrollHeight;
  }, [messages, pending, getViewport]);

  // Attach a scroll listener on the viewport to track distance from bottom
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    function onScroll() {
      const dist = vp!.scrollHeight - vp!.scrollTop - vp!.clientHeight;
      setShowScrollBtn(dist > 200);
    }
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [getViewport]);

  function scrollToBottom() {
    const vp = getViewport();
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  }

  // Sort conversations by most recently updated
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  /** Create a brand new conversation and make it active. */
  function handleNewConversation() {
    const newConvo: ChatConversation = {
      id: `conv-${Date.now()}`,
      title: "Nouvelle conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onConversationsChange((prev) => [newConvo, ...prev]);
    onActiveConversationIdChange(newConvo.id);
    setInput("");
    setPending(false);
  }

  /** Delete a conversation. */
  function handleDeleteConversation(id: string) {
    onConversationsChange((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        onActiveConversationIdChange(updated[0]?.id ?? null);
      }
      return updated;
    });
  }

  /** Update a conversation's messages in the global list (uses functional update to avoid stale closures). */
  function updateConversationMessages(
    convoId: string,
    newMessages: TimestampedChatMessage[],
  ) {
    onConversationsChange((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              messages: newMessages,
              title: deriveTitle(newMessages),
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
  }

  /** Send a message (creating a new conversation if needed). */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const userMessage: TimestampedChatMessage = {
      id: `m-${Date.now()}-user`,
      sender: "user",
      text: trimmed,
      ts: Date.now(),
    };

    // Determine / create the conversation and add the user message atomically
    let convoId = activeConversationId;
    if (!convoId) {
      convoId = `conv-${Date.now()}`;
      const newConvo: ChatConversation = {
        id: convoId,
        title: deriveTitle([userMessage]),
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onConversationsChange((prev) => [newConvo, ...prev]);
      onActiveConversationIdChange(convoId);
    } else {
      updateConversationMessages(convoId, [...messages, userMessage]);
    }

    const withUser = [...messages, userMessage];
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      const parts = (data.parts ?? []) as GroundedPart[];
      const botMessage: TimestampedChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text: parts.map((p) => p.text).join(" "),
        parts: parts.length ? parts : undefined,
        ts: Date.now(),
      };
      updateConversationMessages(convoId, [...withUser, botMessage]);
    } catch (err) {
      const botMessage: TimestampedChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text:
          err instanceof Error
            ? err.message
            : "Une erreur est survenue. Réessayez.",
        ts: Date.now(),
      };
      updateConversationMessages(convoId, [...withUser, botMessage]);
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  /** Group sorted conversations under date headings for the sidebar. */
  const groupedConversations = useMemo(() => {
    const groups: { label: string; convos: ChatConversation[] }[] = [];
    let currentLabel = "";
    for (const convo of sortedConversations) {
      const label = dateGroupLabel(convo.updatedAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, convos: [] });
      }
      groups[groups.length - 1].convos.push(convo);
    }
    return groups;
  }, [sortedConversations]);

  return (
    <div className="flex h-full overflow-hidden rounded-xl ring-1 ring-border">
      {/* ── Conversation history sidebar ── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-slate-50/50">
        <div className="shrink-0 border-b border-border px-3 py-3">
          <Button
            onClick={handleNewConversation}
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nouvelle conversation
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {sortedConversations.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Aucune conversation.
                </p>
              </div>
            )}

            {groupedConversations.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.convos.map((convo) => {
                    const isActive = convo.id === activeConversationId;
                    const refs = extractReferences(convo.messages);
                    const msgCount = convo.messages.length;

                    return (
                      <button
                        key={convo.id}
                        type="button"
                        onClick={() => onActiveConversationIdChange(convo.id)}
                        className={[
                          "group relative flex w-full flex-col gap-1 rounded-lg py-2.5 text-left transition",
                          isActive
                            ? "border-l-[3px] border-l-blue-500 bg-blue-50/80 pl-[calc(0.75rem-3px)] pr-3"
                            : "border-l-[3px] border-l-transparent pl-[calc(0.75rem-3px)] pr-3 hover:bg-muted",
                        ].join(" ")}
                      >
                        {/* Title */}
                        <span
                          className={[
                            "line-clamp-2 text-sm font-medium",
                            isActive ? "text-blue-900" : "text-foreground",
                          ].join(" ")}
                        >
                          {convo.title}
                        </span>

                        {/* Date + message count */}
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(convo.createdAt)}
                          <span className="text-muted-foreground/50">·</span>
                          {timeAgoShort(convo.updatedAt)}
                          {msgCount > 0 && (
                            <>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <MessageSquare className="h-2.5 w-2.5" />
                                {msgCount}
                              </span>
                            </>
                          )}
                        </span>

                        {/* Referenced documents */}
                        {refs.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {refs.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                <FileText className="h-2.5 w-2.5" />
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Delete button */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(convo.id);
                          }}
                          className="absolute right-2 top-2 cursor-pointer rounded p-1 text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Main chat area ── */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-card">
        {/* Chat messages */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="mx-auto max-w-3xl space-y-4 px-6 py-6 text-[15px]">
            {/* Empty state with suggestion chips */}
            <AnimatePresence>
              {messages.length === 0 && !pending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-4 py-24 text-center"
                >
                  <div className="relative">
                    <span className="absolute -inset-3 rounded-full bg-linear-to-br from-blue-100 to-blue-50" />
                    <WaterDropMascot size="lg" className="relative bg-blue-50" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Comment puis-je vous aider ?
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Posez une question sur les corpus réglementaires.
                    </p>
                  </div>

                  {/* Clickable suggestion chips */}
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {SUGGESTION_CHIPS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setInput(q)}
                        className="rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-foreground transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message list — staggered entrance animation */}
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    delay: idx * 0.03,
                  }}
                >
                  <ChatBubble message={m} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator — animated dots */}
            <AnimatePresence>
              {pending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <WaterDropMascot size="sm" thinking className="bg-blue-50" />
                  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                    <TypingDots />
                    <span>Réflexion en cours…</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Scroll-to-bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-lg transition hover:bg-muted"
              aria-label="Défiler vers le bas"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating card input area */}
        <div className="shrink-0 px-6 pb-4 pt-3">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3 rounded-2xl border border-border bg-background p-2 shadow-sm ring-1 ring-black/5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur les règlements..."
                rows={1}
                className="min-h-[40px] max-h-[160px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                disabled={pending || !input.trim()}
                size="icon"
                className="mb-0.5 h-10 w-10 shrink-0 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 transition hover:from-blue-700 hover:to-blue-600 disabled:from-muted disabled:to-muted"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Entrée pour envoyer · Maj+Entrée pour un saut de ligne
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Chat bubble (message rendering) ── */

interface ChatBubbleProps {
  message: TimestampedChatMessage;
}

function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.sender === "user";

  /** Collect all references across parts into a single list for the footer. */
  const allRefs = useMemo(() => {
    const refs: LawReference[] = [];
    if (message.parts) {
      for (const part of message.parts) {
        if (part.articleId) refs.push(...buildRefs(part));
      }
    }
    if (message.references) refs.push(...message.references);
    return refs;
  }, [message]);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} text-[15px]`}
    >
      {!isUser && (
        <div className="mr-2.5 mt-1 shrink-0">
          <WaterDropMascot size="sm" className="bg-blue-50" />
        </div>
      )}
      <div className="flex max-w-[80%] flex-col">
        <div
          className={[
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-linear-to-br from-blue-600 to-blue-500 text-white"
              : "border border-border border-l-[3px] border-l-blue-400 bg-muted text-foreground",
          ].join(" ")}
        >
          {/* Message body with richer Markdown prose styles */}
          {message.parts && message.parts.length > 0 ? (
            <div className="space-y-2 text-[15px]">
              {message.parts.map((part, idx) => (
                <div
                  key={`${message.id}-part-${idx}`}
                  className="prose-sm max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:italic"
                >
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}

          {/* Grouped "Sources" footer for all references */}
          {!isUser && allRefs.length > 0 && (
            <div className="mt-2.5 border-t border-border/50 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sources
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allRefs.map((ref, ri) => (
                  <Badge
                    key={`${message.id}-src-${ri}`}
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 transition-transform hover:scale-105"
                  >
                    {ref.paragraphId
                      ? `§ ${ref.paragraphId}`
                      : `Art. ${ref.articleId}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <span
          className={`mt-0.5 text-[10px] text-muted-foreground ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {timeAgoShort(message.ts)}
        </span>
      </div>
    </div>
  );
}

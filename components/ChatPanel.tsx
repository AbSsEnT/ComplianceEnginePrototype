"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
  ChatMessage,
  GroundedPart,
  LawReference,
  TimestampedChatMessage,
} from "@/lib/law/types";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import WaterDropMascot from "./WaterDropMascot";
import { useI18n } from "@/lib/i18n";

interface ChatPanelProps {
  onReferenceClick: (ref: LawReference) => void;
  /** Controlled messages state — when provided, the panel is in controlled mode. */
  messages?: TimestampedChatMessage[];
  onMessagesChange?: (msgs: TimestampedChatMessage[]) => void;
}

/** Formats a timestamp to a short relative string. */
export function timeAgo(ts: number, locale: "fr" | "de"): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) {
    return locale === "de" ? "gerade eben" : "à l'instant";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return locale === "de"
      ? `vor ${minutes} Min.`
      : `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return locale === "de" ? `vor ${hours} Std.` : `il y a ${hours}h`;
}

export default function ChatPanel({
  onReferenceClick,
  messages: controlledMessages,
  onMessagesChange,
}: ChatPanelProps) {
  // Internal state used only when no controlled props are supplied
  const [internalMessages, setInternalMessages] = useState<TimestampedChatMessage[]>([]);

  const messages = controlledMessages ?? internalMessages;
  const setMessages = onMessagesChange ?? setInternalMessages;

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

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

    setMessages([...messages, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // When using the compact assistant inside the document view we keep
        // the default behaviour ("all sources") by omitting the optional
        // `books` filter. The full-screen chat view exposes finer control.
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur serveur");
      }
      const parts = (data.parts ?? []) as GroundedPart[];
      const botMessage: TimestampedChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text: parts.map((p) => p.text).join(" "),
        parts: parts.length ? parts : undefined,
        ts: Date.now(),
      };
      // Re-read latest messages to avoid stale closure
      setMessages([...messages, userMessage, botMessage]);
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
      setMessages([...messages, userMessage, botMessage]);
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

  return (
    <section className="flex h-full flex-col rounded-xl bg-card ring-1 ring-border">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <WaterDropMascot size="sm" className="bg-blue-50" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t.common.appName} – Assistant
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.chat.quickEmptyPrompt}
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-3 px-4 py-3 text-[15px]">
          <AnimatePresence>
            {messages.length === 0 && !pending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-12 text-center"
              >
                <WaterDropMascot size="lg" className="bg-blue-50" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t.chat.fullEmptyTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.chat.fullEmptySubtitle}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <MessageBubble
                  message={m}
                  onReferenceClick={onReferenceClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {pending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <WaterDropMascot size="sm" thinking className="bg-blue-50" />
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  {t.chat.fullTyping}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-3 py-2.5"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.quickPlaceholder}
            rows={1}
            className="min-h-[36px] max-h-[120px] flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            disabled={pending || !input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t.chat.fullTextareaHint}
        </p>
      </form>
    </section>
  );
}

/** Extracts law references from a grounded response part. */
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

interface MessageBubbleProps {
  message: TimestampedChatMessage;
  onReferenceClick: (ref: LawReference) => void;
}

function MessageBubble({ message, onReferenceClick }: MessageBubbleProps) {
  const isUser = message.sender === "user";
  const { locale } = useI18n();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} text-[15px]`}>
      {!isUser && (
        <div className="mr-2 mt-1 shrink-0">
          <WaterDropMascot size="sm" className="bg-blue-50" />
        </div>
      )}
      <div className="flex max-w-[80%] flex-col">
        <div
          className={[
            "rounded-lg px-3 py-2",
            isUser
              ? "bg-blue-600 text-white"
              : "border border-border bg-muted text-foreground",
          ].join(" ")}
        >
          {message.parts && message.parts.length > 0 ? (
            <div className="space-y-3 text-[15px]">
              {message.parts.map((part, idx) => (
                <div
                  key={`${message.id}-part-${idx}`}
                  className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"
                >
                  <div className="[&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  </div>
                  {part.articleId &&
                    buildRefs(part).map((ref, ri) => (
                      <button
                        key={`${message.id}-part-${idx}-ref-${ri}`}
                        type="button"
                        onClick={() => onReferenceClick(ref)}
                        className="shrink-0"
                      >
                        <Badge
                          variant="outline"
                          className="cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100"
                        >
                          {ref.paragraphId
                            ? `§ ${ref.paragraphId}`
                            : `Art. ${ref.articleId}`}
                        </Badge>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.references && message.references.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.references.map((ref, idx) => (
                    <button
                      key={`${message.id}-ref-${idx}`}
                      type="button"
                      onClick={() => onReferenceClick(ref)}
                      className="shrink-0"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100"
                      >
                        {ref.paragraphId
                          ? `§ ${ref.paragraphId}`
                          : `Art. ${ref.articleId}`}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <span
          className={`mt-0.5 text-[10px] text-muted-foreground ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {timeAgo(message.ts, locale)}
        </span>
      </div>
    </div>
  );
}

"use client";

/**
 * QuickChat — a compact chat widget for the home dashboard.
 * Shares message state with the full ChatPanel so conversations persist
 * when switching between the home view and the document view.
 */

import { useEffect, useRef, useState } from "react";
import type { GroundedPart, TimestampedChatMessage } from "@/lib/law/types";
import { Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import WaterDropMascot from "./WaterDropMascot";
import { timeAgo } from "./ChatPanel";
import { useI18n } from "@/lib/i18n";

interface QuickChatProps {
  messages: TimestampedChatMessage[];
  onMessagesChange: (msgs: TimestampedChatMessage[]) => void;
  /** Called when the user wants to open the full assistant panel */
  onOpenFullChat: () => void;
}

const MAX_VISIBLE_MESSAGES = 4;

export default function QuickChat({
  messages,
  onMessagesChange,
  onOpenFullChat,
}: QuickChatProps) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.slice(-MAX_VISIBLE_MESSAGES);
  const { t } = useI18n();

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

    onMessagesChange([...messages, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // QuickChat uses the default behaviour ("all sources") by sending
        // only the message. Advanced source filtering is available in the
        // dedicated Assistant view.
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
      onMessagesChange([...messages, userMessage, botMessage]);
    } catch (err) {
      const botMessage: TimestampedChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text:
          err instanceof Error
            ? err.message
            : t.chat.quickErrorGeneric,
        ts: Date.now(),
      };
      onMessagesChange([...messages, userMessage, botMessage]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages preview */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-2 py-3 text-sm">
          {visibleMessages.length === 0 && !pending && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              {/* Pulse ring around mascot to signal "alive & ready" */}
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-[pulse-ring_2.5s_ease-out_infinite]" />
                <WaterDropMascot size="md" className="relative bg-blue-50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t.chat.quickEmptyPrompt}
              </p>
            </div>
          )}

          {visibleMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "bot" && (
                <div className="mr-1.5 mt-0.5 shrink-0">
                  <WaterDropMascot size="sm" className="bg-blue-50" />
                </div>
              )}
              <div
                className={[
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm",
                  m.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-border bg-muted text-foreground",
                ].join(" ")}
              >
                <p className="line-clamp-3 whitespace-pre-wrap">{m.text}</p>
                <span className="mt-0.5 block text-[10px] opacity-60">
                  {timeAgo(m.ts)}
                </span>
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex items-center gap-1.5">
              <WaterDropMascot size="sm" thinking className="bg-blue-50" />
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-[3px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full bg-blue-500"
                      style={{ animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </span>
                Réflexion…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compact input */}
      <div className="border-t border-border px-3 py-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.quickPlaceholder}
            className="h-8 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            disabled={pending || !input.trim()}
            size="icon-xs"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
        <button
          type="button"
          onClick={onOpenFullChat}
          className="mt-1.5 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-blue-600 transition hover:text-blue-800"
        >
          {t.chat.quickOpenFull}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

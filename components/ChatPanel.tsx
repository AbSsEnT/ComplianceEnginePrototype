"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, GroundedPart, LawReference } from "@/lib/law/types";

interface ChatPanelProps {
  onReferenceClick: (ref: LawReference) => void;
}

export default function ChatPanel({ onReferenceClick }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}-user`,
      sender: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur serveur");
      }
      const parts = (data.parts ?? []) as GroundedPart[];
      const botMessage: ChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text: parts.map((p) => p.text).join(" "),
        parts: parts.length ? parts : undefined,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const botMessage: ChatMessage = {
        id: `m-${Date.now()}-bot`,
        sender: "bot",
        text:
          err instanceof Error
            ? err.message
            : "Une erreur est survenue. Réessayez.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Assistant règlementaire
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Posez une question sur le règlement ERP. Les réponses s&apos;appuient sur
          le Livre Ier.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[15px]">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-500">
            Commencez par poser une question, par exemple :{" "}
            <span className="italic">
              &laquo; Comment sont classés les établissements ? &raquo;
            </span>
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onReferenceClick={onReferenceClick}
          />
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 px-3 py-2"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question sur le règlement..."
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "En cours..." : "Envoyer"}
          </button>
        </div>
      </form>
    </section>
  );
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

interface MessageBubbleProps {
  message: ChatMessage;
  onReferenceClick: (ref: LawReference) => void;
}

function MessageBubble({ message, onReferenceClick }: MessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} text-[15px]`}
    >
      <div
        className={[
          "max-w-[80%] rounded-lg px-3 py-2",
          isUser
            ? "bg-zinc-900 text-zinc-50"
            : "bg-zinc-100 text-zinc-900 border border-zinc-200",
        ].join(" ")}
      >
        {message.parts && message.parts.length > 0 ? (
          <div className="space-y-3 text-[15px]">
            {message.parts.map((part, idx) => (
              <div
                key={`${message.id}-part-${idx}`}
                className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"
              >
                <div className="[&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-zinc-800">
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
                {part.articleId &&
                  buildRefs(part).map((ref, ri) => (
                    <button
                      key={`${message.id}-part-${idx}-ref-${ri}`}
                      type="button"
                      onClick={() => onReferenceClick(ref)}
                      className="shrink-0 rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                    >
                      {ref.paragraphId
                        ? `§ ${ref.paragraphId}`
                        : `Art. ${ref.articleId}`}
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
                    className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                  >
                    {ref.paragraphId
                      ? `Paragraphe ${ref.paragraphId}`
                      : `Article ${ref.articleId}`}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


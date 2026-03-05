import type { LawBook } from "@/lib/law/types";
import DocumentWithChat from "@/components/DocumentWithChat";
import livres from "./data/erp_livre1.json";

export default function Home() {
  return (
    <main className="flex h-screen flex-col bg-white font-sans text-zinc-900">
      <header className="shrink-0 border-b border-zinc-200 px-4 py-3 md:px-8">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Règlement de sécurité ERP
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Consultez le texte du règlement et interrogez l'assistant pour obtenir
          des références.
        </p>
      </header>
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-8">
        <DocumentWithChat books={livres as LawBook[]} />
      </div>
    </main>
  );
}

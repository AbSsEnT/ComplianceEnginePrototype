import type { LawBook, LawSource } from "@/lib/law/types";
import erpLivre1 from "./erp_livre1.json";

/**
 * This file defines the high-level library organization shown in the UI.
 *
 * Why it exists:
 * - The application now has its own identity ("SafeLink").
 * - Regulatory documents are grouped by source (ERP, APSAD, EN/NF, ...).
 * - Each source can contain multiple books/codes.
 *
 * Note:
 * - Only ERP Livre I is fully loaded with chapter/article content for now.
 * - Other entries are intentionally scaffolded placeholders so navigation is
 *   ready as additional sources/books are imported.
 */
const erpBooks: LawBook[] = [
  ...(erpLivre1 as LawBook[]),
  {
    id: "erp-livre-2",
    kind: "book",
    label: "Livre II",
    heading: "Dispositions particulières (à intégrer).",
  },
  {
    id: "erp-livre-3",
    kind: "book",
    label: "Livre III",
    heading: "Dispositions techniques complémentaires (à intégrer).",
  },
  {
    id: "erp-livre-4",
    kind: "book",
    label: "Livre IV",
    heading: "Dispositions spécifiques supplémentaires (à intégrer).",
  },
];

export const lawSources: LawSource[] = [
  {
    id: "erp-reglement-securite",
    label: "Reglement de securite ERP",
    description:
      "Corpus legal francais ERP organise en livres distincts (I a IV).",
    books: erpBooks,
  },
  {
    id: "apsad",
    label: "Regles APSAD",
    description:
      "Referentiels techniques assures par le CNPP (exemple initial: R1).",
    books: [
      {
        id: "apsad-r1",
        kind: "book",
        label: "APSAD R1",
        heading: "Regle APSAD R1 (a integrer).",
      },
    ],
  },
  {
    id: "en-nf",
    label: "Normes EN / NF",
    description:
      "Normes europeennes et transpositions francaises utiles aux projets.",
    books: [
      {
        id: "en-nf-codes",
        kind: "book",
        label: "Corpus EN / NF",
        heading: "Normes harmonisees et versions francaises (a integrer).",
      },
    ],
  },
];


import type { ReactNode } from "react";
import { LEGAL_VERSION } from "@/lib/legal";

interface LegalDocumentProps {
  title: string;
  children: ReactNode;
}

export function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <article className="px-6 py-8 max-w-3xl mx-auto space-y-6 text-sm text-text-secondary leading-relaxed">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gold">
          Draft {LEGAL_VERSION} · pending legal review
        </p>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      </header>
      {children}
    </article>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-text-primary">{heading}</h2>
      {children}
    </section>
  );
}

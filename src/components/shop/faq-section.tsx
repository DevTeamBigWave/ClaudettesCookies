import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema } from "@/lib/seo";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * A visible FAQ list that also emits matching FAQPage JSON-LD, so the questions
 * are eligible for rich results. Answers are plain text to keep the schema valid.
 */
export function FaqSection({
  items,
  title = "Questions, answered",
  className,
}: {
  items: FaqItem[];
  title?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <JsonLd data={faqSchema(items)} />
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <dl className="mt-6 divide-y divide-border">
        {items.map((f) => (
          <div key={f.question} className="py-5">
            <dt className="font-semibold">{f.question}</dt>
            <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

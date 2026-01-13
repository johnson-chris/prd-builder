import { slugify } from '@/lib/utils';
import type { PrdSection as PrdSectionType } from '@/types';

interface PrdSectionProps {
  section: PrdSectionType;
}

export function PrdSection({ section }: PrdSectionProps): JSX.Element {
  const hasContent = section.content.replace(/<[^>]*>/g, '').trim().length > 0;
  const anchorId = slugify(section.id);

  return (
    <section id={anchorId} className="prd-section scroll-mt-24">
      <h2 className="prd-section-title text-xl font-semibold text-primary mb-4 flex items-center gap-2">
        {section.title}
        {section.required && (
          <span className="text-xs font-normal text-error">Required</span>
        )}
      </h2>

      {hasContent ? (
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      ) : (
        <p className="text-text-muted italic">No content provided for this section.</p>
      )}
    </section>
  );
}

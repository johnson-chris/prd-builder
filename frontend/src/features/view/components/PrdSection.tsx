import { slugify } from '@/lib/utils';
import type { PrdSection as PrdSectionType } from '@/types';

interface PrdSectionProps {
  section: PrdSectionType;
}

// Strip leading heading if it matches the section title (avoids duplication)
function stripDuplicateHeading(content: string, title: string): string {
  // Match leading h1, h2, or h3 tags
  const headingMatch = content.match(/^\s*<(h[1-3])[^>]*>(.*?)<\/\1>/i);
  if (headingMatch) {
    const headingText = headingMatch[2].replace(/<[^>]*>/g, '').trim().toLowerCase();
    const titleText = title.trim().toLowerCase();
    // If heading matches title, remove it
    if (headingText === titleText) {
      return content.replace(headingMatch[0], '').trim();
    }
  }
  return content;
}

export function PrdSection({ section }: PrdSectionProps): JSX.Element {
  const cleanedContent = stripDuplicateHeading(section.content, section.title);
  const hasContent = cleanedContent.replace(/<[^>]*>/g, '').trim().length > 0;
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
          dangerouslySetInnerHTML={{ __html: cleanedContent }}
        />
      ) : (
        <p className="text-text-muted italic">No content provided for this section.</p>
      )}
    </section>
  );
}

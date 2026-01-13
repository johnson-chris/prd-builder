import type { PrdSection } from '@/types';

interface TableOfContentsProps {
  sections: PrdSection[];
  onJumpToSection: (sectionId: string) => void;
}

export function TableOfContents({ sections, onJumpToSection }: TableOfContentsProps): JSX.Element {
  return (
    <nav className="toc mb-8 p-6 bg-gray-50 rounded-lg no-print">
      <h2 className="text-lg font-semibold text-primary mb-4">Table of Contents</h2>
      <ol className="space-y-2">
        {sections.map((section, index) => {
          const hasContent = section.content.replace(/<[^>]*>/g, '').trim().length > 0;
          return (
            <li key={section.id} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  hasContent ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {hasContent ? '✓' : index + 1}
              </span>
              <button
                onClick={() => onJumpToSection(section.id)}
                className="text-left hover:text-accent transition-colors"
              >
                {section.title}
                {section.required && <span className="ml-2 text-xs text-error">*</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-text-muted">* Required sections</p>
    </nav>
  );
}

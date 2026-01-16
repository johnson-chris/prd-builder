import type { PrdSection } from '@/types';

interface PrintTableOfContentsProps {
  sections: PrdSection[];
}

export function PrintTableOfContents({ sections }: PrintTableOfContentsProps): JSX.Element {
  return (
    <nav className="print-toc hidden print:block mb-8">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-300">Table of Contents</h2>
      <ol className="space-y-1">
        {sections.map((section, index) => {
          const hasContent = section.content.replace(/<[^>]*>/g, '').trim().length > 0;
          return (
            <li key={section.id} className="flex items-baseline">
              <span className="w-6 text-right mr-3 text-gray-500">{index + 1}.</span>
              <span className={hasContent ? '' : 'text-gray-400 italic'}>
                {section.title}
              </span>
              {!hasContent && (
                <span className="ml-2 text-gray-400 text-sm">(empty)</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';
import type { PrdSection } from '@/types';

interface SectionAccordionProps {
  section: PrdSection;
  onChange: (content: string) => void;
  onPlanningRequest: () => void;
  isActive: boolean;
  onToggle: () => void;
  isNewPrd?: boolean;
}

export function SectionAccordion({ section, onChange, onPlanningRequest, isActive, onToggle, isNewPrd = false }: SectionAccordionProps): JSX.Element {
  const [localContent, setLocalContent] = useState(section.content);

  // Sync local state when parent content changes (e.g., from AI suggestions)
  useEffect(() => {
    setLocalContent(section.content);
  }, [section.content]);

  const hasContent = localContent.replace(/<[^>]*>/g, '').trim().length > 0;

  const handleChange = (html: string): void => {
    setLocalContent(html);
    onChange(html);
  };

  return (
    <div className={cn('rounded-lg border transition-colors', isActive ? 'border-accent bg-white shadow-sm' : 'border-border bg-white')}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium', hasContent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
            {hasContent ? '✓' : section.order}
          </span>
          <div>
            <h3 className="font-medium text-primary">{section.title}</h3>
            {section.required && <span className="text-xs text-error">Required</span>}
          </div>
        </div>
        <svg className={cn('h-5 w-5 text-text-muted transition-transform', isActive && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isActive && (
        <div className="border-t border-border px-4 py-4">
          {section.guidance && (
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              <strong>Guidance:</strong> {section.guidance}
            </div>
          )}

          <RichTextEditor
            content={localContent}
            onChange={handleChange}
            placeholder={`Enter ${section.title.toLowerCase()}...`}
          />

          <div className="mt-4 flex justify-end">
            <div className="relative group">
              <button
                type="button"
                onClick={onPlanningRequest}
                disabled={isNewPrd}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isNewPrd
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-accent/10 text-accent hover:bg-accent/20"
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Get AI Suggestions
              </button>
              {isNewPrd && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                  <div className="rounded bg-gray-800 px-3 py-2 text-xs text-white whitespace-nowrap shadow-lg">
                    Save the PRD first to use AI suggestions
                    <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

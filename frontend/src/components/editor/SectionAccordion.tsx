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
    <div className={cn(
      'rounded-2xl border-2 transition-all duration-200',
      isActive
        ? 'border-stone-300 bg-white shadow-sm'
        : 'border-stone-200/50 bg-white hover:border-stone-200'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <span className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl text-sm font-medium transition-colors',
            hasContent
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-stone-100 text-stone-500'
          )}>
            {hasContent ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : section.order}
          </span>
          <div>
            <h3 className="font-medium text-stone-900">{section.title}</h3>
            {section.required && (
              <span className="text-xs text-amber-600 font-medium">Required</span>
            )}
          </div>
        </div>
        <svg
          className={cn(
            'h-5 w-5 text-stone-400 transition-transform duration-200',
            isActive && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isActive && (
        <div className="border-t border-stone-100 px-5 py-5">
          {section.guidance && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-100 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm text-amber-800">{section.guidance}</p>
              </div>
            </div>
          )}

          <RichTextEditor
            content={localContent}
            onChange={handleChange}
            placeholder={`Enter ${section.title.toLowerCase()}...`}
          />

          <div className="mt-5 flex justify-end">
            <div className="relative group">
              <button
                type="button"
                onClick={onPlanningRequest}
                disabled={isNewPrd}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  isNewPrd
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                    : "bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Get AI Suggestions
              </button>
              {isNewPrd && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                  <div className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs text-white whitespace-nowrap shadow-xl">
                    Save the PRD first to use AI suggestions
                    <div className="absolute top-full right-4 border-4 border-transparent border-t-stone-900" />
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

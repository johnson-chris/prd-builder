import { useState } from 'react';
import type { ExtractedSection } from '@/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceQuotes } from './SourceQuotes';

interface ExtractionPreviewProps {
  sections: ExtractedSection[];
  suggestedTitle: string;
  analysisNotes: string;
  onTitleChange: (title: string) => void;
  onSectionToggle: (sectionId: string, included: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  isCreating: boolean;
}

export function ExtractionPreview({
  sections,
  suggestedTitle,
  analysisNotes,
  onTitleChange,
  onSectionToggle,
  onConfirm,
  onBack,
  isCreating,
}: ExtractionPreviewProps): JSX.Element {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const includedCount = sections.filter((s) => s.included).length;
  const highConfidenceCount = sections.filter((s) => s.confidence === 'high').length;
  const lowConfidenceCount = sections.filter((s) => s.confidence === 'low').length;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Title input */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          PRD Title
        </label>
        <input
          type="text"
          value={suggestedTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter PRD title..."
          className="auth-input-warm w-full"
        />
      </div>

      {/* Analysis summary */}
      {analysisNotes && (
        <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-stone-200 flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700 mb-1">Analysis Notes</p>
              <p className="text-sm text-stone-600">{analysisNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-stone-600">{highConfidenceCount} high confidence</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-stone-400" />
          <span className="text-stone-600">{lowConfidenceCount} need review</span>
        </div>
        <div className="ml-auto text-stone-500">
          {includedCount} of {sections.length} sections selected
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sections.map((section) => (
          <div
            key={section.sectionId}
            className={`rounded-2xl border p-4 transition-all ${
              section.included
                ? 'border-stone-200 bg-white'
                : 'border-stone-100 bg-stone-50 opacity-60'
            }`}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <label className="flex items-center mt-0.5">
                <input
                  type="checkbox"
                  checked={section.included}
                  onChange={(e) => onSectionToggle(section.sectionId, e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                />
              </label>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium text-stone-900">
                    {section.sectionTitle}
                  </h4>
                  <ConfidenceBadge level={section.confidence} />
                </div>

                {/* Content preview */}
                {section.content && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.sectionId)}
                      className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className={`h-3 w-3 transition-transform ${expandedSections.has(section.sectionId) ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {expandedSections.has(section.sectionId) ? 'Hide' : 'Show'} extracted content
                    </button>

                    {expandedSections.has(section.sectionId) && (
                      <div className="mt-2 rounded-xl bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-wrap">
                        {section.content}
                      </div>
                    )}
                  </div>
                )}

                {!section.content && (
                  <p className="mt-1 text-xs text-stone-400 italic">
                    No content extracted - you can add this later in the editor
                  </p>
                )}

                {/* Source quotes */}
                {section.sourceQuotes.length > 0 && (
                  <SourceQuotes quotes={section.sourceQuotes} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low confidence warning */}
      {lowConfidenceCount > 3 && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">Limited content extracted</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Many sections have low confidence. Consider using the AI Planning Assistant in the editor to refine each section.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onBack}
          disabled={isCreating}
          className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!suggestedTitle.trim() || includedCount === 0 || isCreating}
          className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isCreating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create PRD
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';

interface ConfidenceReasonProps {
  reason: string;
}

export function ConfidenceReason({ reason }: ConfidenceReasonProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
      >
        <svg
          className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {isExpanded ? 'Hide' : 'Why this rating?'}
      </button>
      {isExpanded && (
        <div className="mt-1.5 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
          {reason}
        </div>
      )}
    </div>
  );
}

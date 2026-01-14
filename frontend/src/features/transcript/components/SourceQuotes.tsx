import { useState } from 'react';

interface SourceQuotesProps {
  quotes: string[];
}

export function SourceQuotes({ quotes }: SourceQuotesProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  if (quotes.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic">No source quotes available</p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {quotes.length} source quote{quotes.length !== 1 ? 's' : ''} from transcript
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 pl-5 border-l-2 border-stone-200">
          {quotes.map((quote, index) => (
            <blockquote
              key={index}
              className="text-xs text-stone-600 italic bg-stone-50 rounded-lg px-3 py-2"
            >
              "{quote}"
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

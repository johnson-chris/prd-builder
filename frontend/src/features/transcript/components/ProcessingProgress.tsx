import type { PreprocessedInfo } from '@/lib/api';

interface ProcessingProgressProps {
  stage: string;
  progress: number;
  onCancel: () => void;
  preprocessedInfo?: PreprocessedInfo | null;
}

const stageMessages: Record<string, string> = {
  preprocessing: 'Cleaning transcript...',
  analyzing: 'Analyzing transcript structure...',
  extracting: 'Extracting requirements...',
  mapping: 'Mapping to PRD sections...',
  complete: 'Analysis complete!',
};

export function ProcessingProgress({
  stage,
  progress,
  onCancel,
  preprocessedInfo,
}: ProcessingProgressProps): JSX.Element {
  const message = stageMessages[stage] || 'Processing...';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8">
      {/* Preprocessing info banner */}
      {preprocessedInfo && (
        <div className="w-full max-w-md mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                Transcript automatically cleaned
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Reduced from {preprocessedInfo.originalChars.toLocaleString()} to{' '}
                {preprocessedInfo.cleanedChars.toLocaleString()} characters
                <span className="font-medium"> ({preprocessedInfo.reductionPercent}% smaller)</span>
              </p>
              {Object.keys(preprocessedInfo.speakerMap).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(preprocessedInfo.speakerMap).slice(0, 4).map(([full, abbrev]) => (
                    <span
                      key={full}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800"
                    >
                      [{abbrev}] {full.length > 15 ? `${full.slice(0, 15)}...` : full}
                    </span>
                  ))}
                  {Object.keys(preprocessedInfo.speakerMap).length > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                      +{Object.keys(preprocessedInfo.speakerMap).length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animated document icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        {/* Scanning animation */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
        >
          <div className="w-full h-full bg-gradient-to-b from-stone-900/10 to-stone-900/5 animate-pulse" />
        </div>
        {/* Progress ring */}
        <svg
          className="absolute -inset-2 w-24 h-24"
          viewBox="0 0 100 100"
        >
          <circle
            className="text-stone-200"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          <circle
            className="text-stone-600 transition-all duration-500"
            strokeWidth="4"
            strokeDasharray={`${progress * 2.83} 283`}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            transform="rotate(-90 50 50)"
          />
        </svg>
      </div>

      {/* Progress text */}
      <div className="text-center mb-6">
        <p className="font-display text-xl font-semibold text-stone-900 mb-1">
          {message}
        </p>
        <p className="text-sm text-stone-500">
          {progress}% complete
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-8">
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-stone-400 to-stone-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Cancel button */}
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { filesApi, FileExtractedSection } from '@/lib/api';
import { usePrdStore } from '@/stores/prdStore';
import { FileUploadInput } from './components/FileUploadInput';
import { ProcessingProgress } from '@/features/transcript/components/ProcessingProgress';
import { ConfidenceBadge } from '@/features/transcript/components/ConfidenceBadge';

interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'processing' | 'preview';

export function FileImportModal({ isOpen, onClose }: FileImportModalProps): JSX.Element | null {
  const navigate = useNavigate();
  const { createPrd, updatePrd } = usePrdStore();

  const [step, setStep] = useState<Step>('input');
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Processing state
  const [stage, setStage] = useState('parsing');
  const [progress, setProgress] = useState(0);
  const [abortFn, setAbortFn] = useState<(() => void) | null>(null);

  // Preview state
  const [sections, setSections] = useState<FileExtractedSection[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setFiles([]);
      setContext('');
      setGitUrl('');
      setError(undefined);
      setStage('parsing');
      setProgress(0);
      setSections([]);
      setSuggestedTitle('');
      setAnalysisNotes('');
      setIsCreating(false);
      if (abortFn) abortFn();
    }
  }, [isOpen, abortFn]);

  const handleAnalyze = useCallback(() => {
    if (files.length === 0 && !gitUrl.trim()) {
      setError('Please upload at least one file or provide a Git URL');
      return;
    }

    setError(undefined);
    setStep('processing');
    setProgress(0);
    setSections([]);

    const abort = filesApi.analyze(
      files,
      {
        onProgress: (s, p) => {
          setStage(s);
          setProgress(p);
        },
        onSection: (section) => {
          setSections((prev) => [...prev, section]);
        },
        onComplete: (title, notes) => {
          setSuggestedTitle(title);
          setAnalysisNotes(notes);
          setStep('preview');
        },
        onError: (err) => {
          console.error('File analysis error:', err);
          setError(err.message || 'Analysis failed. Please try again.');
          setStep('input');
        },
      },
      context || undefined,
      gitUrl || undefined
    );

    setAbortFn(() => abort);
  }, [files, context, gitUrl]);

  const handleCancel = useCallback(() => {
    if (abortFn) abortFn();
    setStep('input');
    setProgress(0);
  }, [abortFn]);

  const handleSectionToggle = useCallback((sectionId: string, included: boolean) => {
    setSections((prev) =>
      prev.map((s) => (s.sectionId === sectionId ? { ...s, included } : s))
    );
  }, []);

  const handleCreatePrd = useCallback(async () => {
    if (!suggestedTitle.trim()) return;

    setIsCreating(true);
    try {
      // Create the PRD
      const newPrd = await createPrd(suggestedTitle);

      // Build sections from extracted content
      const includedSections = sections.filter((s) => s.included);
      const prdSections = newPrd.sections.map((section) => {
        const extracted = includedSections.find((e) => e.sectionId === section.id);
        if (extracted && extracted.content) {
          // Convert markdown to basic HTML
          let html = extracted.content;
          html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
          html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
          html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
          html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
          html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
          html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
          html = html.replace(/\n\n/g, '</p><p>');
          if (!html.startsWith('<')) html = `<p>${html}</p>`;

          return {
            ...section,
            content: html,
            completed: true,
          };
        }
        return section;
      });

      // Update with sections
      await updatePrd(newPrd.id, {
        title: suggestedTitle,
        sections: prdSections,
      });

      onClose();
      navigate(`/prd/${newPrd.id}`);
    } catch (err) {
      console.error('Failed to create PRD:', err);
      setError('Failed to create PRD. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [suggestedTitle, sections, createPrd, updatePrd, onClose, navigate]);

  if (!isOpen) return null;

  const highConfidence = sections.filter((s) => s.confidence === 'high').length;
  const mediumConfidence = sections.filter((s) => s.confidence === 'medium').length;
  const lowConfidence = sections.filter((s) => s.confidence === 'low').length;
  const includedCount = sections.filter((s) => s.included).length;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm"
        onClick={step === 'processing' ? undefined : onClose}
      />

      {/* Centering wrapper */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-stone-200/50 shadow-2xl animate-fade-in-up"
          style={{ animationFillMode: 'both' }}
        >
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-stone-900">
                Import from Files
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {step === 'input' && 'Upload code, documents, or spreadsheets to extract PRD content'}
                {step === 'processing' && 'Analyzing your files...'}
                {step === 'preview' && 'Review extracted content before creating your PRD'}
              </p>
            </div>
            {step !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {['input', 'processing', 'preview'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step === s
                      ? 'bg-stone-900'
                      : i < ['input', 'processing', 'preview'].indexOf(step)
                      ? 'bg-stone-400'
                      : 'bg-stone-200'
                  }`}
                />
                {i < 2 && <div className="w-8 h-px bg-stone-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 flex-1 min-h-0 overflow-y-auto">
          {step === 'input' && (
            <>
              <FileUploadInput
                files={files}
                onFilesChange={setFiles}
                context={context}
                onContextChange={setContext}
                gitUrl={gitUrl}
                onGitUrlChange={setGitUrl}
                error={error}
              />
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={files.length === 0 && !gitUrl.trim()}
                  className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze Files
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <ProcessingProgress
              stage={stage}
              progress={progress}
              onCancel={handleCancel}
            />
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Title input */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  PRD Title
                </label>
                <input
                  type="text"
                  value={suggestedTitle}
                  onChange={(e) => setSuggestedTitle(e.target.value)}
                  className="w-full rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
                  placeholder="Enter PRD title..."
                />
              </div>

              {/* Analysis notes */}
              {analysisNotes && (
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
                  <p className="text-sm text-stone-600">{analysisNotes}</p>
                </div>
              )}

              {/* Confidence summary */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-stone-500">Extraction confidence:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {highConfidence} high
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {mediumConfidence} medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-stone-400" />
                  {lowConfidence} low
                </span>
              </div>

              {/* Sections */}
              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.sectionId}
                    className={`rounded-2xl border p-4 transition-colors ${
                      section.included
                        ? 'border-stone-200 bg-white'
                        : 'border-stone-100 bg-stone-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={section.included}
                        onChange={(e) => handleSectionToggle(section.sectionId, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-stone-900">{section.sectionTitle}</h4>
                          <ConfidenceBadge confidence={section.confidence} />
                        </div>
                        <p className="text-sm text-stone-600 line-clamp-3">
                          {section.content.replace(/<[^>]*>/g, '').substring(0, 200)}
                          {section.content.length > 200 && '...'}
                        </p>
                        {section.sourceFiles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {section.sourceFiles.slice(0, 3).map((sf) => (
                              <span
                                key={sf.filename}
                                className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {sf.filename}
                              </span>
                            ))}
                            {section.sourceFiles.length > 3 && (
                              <span className="text-xs text-stone-400">
                                +{section.sourceFiles.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Low confidence warning */}
              {lowConfidence > highConfidence + mediumConfidence && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    Many sections have low confidence. The files may not contain enough explicit requirements.
                    Consider adding more context or using the AI Planning feature to refine content.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Back to files
                </button>
                <button
                  type="button"
                  onClick={handleCreatePrd}
                  disabled={!suggestedTitle.trim() || includedCount === 0 || isCreating}
                  className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create PRD with {includedCount} section{includedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

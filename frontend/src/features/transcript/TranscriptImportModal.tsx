import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { transcriptApi, type PreprocessedInfo } from '@/lib/api';
import { usePrdStore } from '@/stores/prdStore';
import type { ExtractedSection } from '@/types';
import { TranscriptInput } from './components/TranscriptInput';
import { ProcessingProgress } from './components/ProcessingProgress';
import { ExtractionPreview } from './components/ExtractionPreview';

interface TranscriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'processing' | 'preview';

export function TranscriptImportModal({ isOpen, onClose }: TranscriptImportModalProps): JSX.Element | null {
  const navigate = useNavigate();
  const { createPrd, updatePrd } = usePrdStore();

  const [step, setStep] = useState<Step>('input');
  const [transcript, setTranscript] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Processing state
  const [stage, setStage] = useState('analyzing');
  const [progress, setProgress] = useState(0);
  const [abortFn, setAbortFn] = useState<(() => void) | null>(null);
  const [preprocessedInfo, setPreprocessedInfo] = useState<PreprocessedInfo | null>(null);

  // Preview state
  const [sections, setSections] = useState<ExtractedSection[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setTranscript('');
      setContext('');
      setError(undefined);
      setStage('analyzing');
      setProgress(0);
      setSections([]);
      setSuggestedTitle('');
      setAnalysisNotes('');
      setIsCreating(false);
      setPreprocessedInfo(null);
      if (abortFn) abortFn();
    }
  }, [isOpen, abortFn]);

  const handleAnalyze = useCallback(() => {
    if (transcript.length < 100) {
      setError('Transcript must be at least 100 characters');
      return;
    }

    setError(undefined);
    setStep('processing');
    setProgress(0);
    setSections([]);
    setPreprocessedInfo(null);

    const abort = transcriptApi.analyze(
      transcript,
      {
        onProgress: (s, p) => {
          setStage(s);
          setProgress(p);
        },
        onPreprocessed: (info) => {
          setPreprocessedInfo(info);
          setStage('preprocessing');
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
          console.error('Transcript analysis error:', err);
          setError(err.message || 'Analysis failed. Please try again.');
          setStep('input');
        },
      },
      context || undefined
    );

    setAbortFn(() => abort);
  }, [transcript, context]);

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
                Create PRD from Transcript
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {step === 'input' && 'Upload or paste a meeting transcript to extract PRD content'}
                {step === 'processing' && 'Analyzing your transcript...'}
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
              <TranscriptInput
                value={transcript}
                onChange={setTranscript}
                context={context}
                onContextChange={setContext}
                error={error}
              />
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={transcript.length < 100}
                  className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze Transcript
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <ProcessingProgress
              stage={stage}
              progress={progress}
              onCancel={handleCancel}
              preprocessedInfo={preprocessedInfo}
            />
          )}

          {step === 'preview' && (
            <ExtractionPreview
              sections={sections}
              suggestedTitle={suggestedTitle}
              analysisNotes={analysisNotes}
              onTitleChange={setSuggestedTitle}
              onSectionToggle={handleSectionToggle}
              onConfirm={handleCreatePrd}
              onBack={() => setStep('input')}
              isCreating={isCreating}
            />
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

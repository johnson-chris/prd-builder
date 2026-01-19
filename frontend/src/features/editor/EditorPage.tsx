import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePrdStore } from '@/stores/prdStore';
import { SectionAccordion } from '@/components/editor';
import { PlanningPanel } from '@/features/planning/PlanningPanel';
import { debounce } from '@/lib/utils';
import { saveDraft, loadDraft, clearDraft } from '@/lib/storage';
import { createDefaultSections } from '@/types';
import type { PrdSection, PrdStatus } from '@/types';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'in-review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
];

export function EditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPrd, isLoadingPrd: loading, error, fetchPrd, createPrd, updatePrd, downloadPrd } = usePrdStore();
  const isNew = !id || id === 'new';

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<PrdStatus>('draft');
  const [sections, setSections] = useState<PrdSection[]>(createDefaultSections);
  const [activeSection, setActiveSection] = useState<number | null>(0);
  const [planningSection, setPlanningSection] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{ title: string; sections: PrdSection[] } | null>(null);

  useEffect(() => {
    if (isNew) {
      // Always reset to defaults first when navigating to new
      setTitle('');
      setStatus('draft');
      setSections(createDefaultSections());
      setActiveSection(0);
      setPlanningSection(null);

      // Check for existing draft
      const draft = loadDraft();
      if (draft && (draft.title || draft.sections.some(s => s.content))) {
        // There's a draft with content - ask user what to do
        setPendingDraft(draft);
        setShowDraftPrompt(true);
      }
    } else if (id) {
      // Reset prompt state when loading existing PRD
      setShowDraftPrompt(false);
      setPendingDraft(null);
      fetchPrd(id);
    }
  }, [id, isNew, fetchPrd]);

  useEffect(() => {
    if (currentPrd && !isNew) {
      setTitle(currentPrd.title);
      setStatus(currentPrd.status);
      setSections(currentPrd.sections);
    }
  }, [currentPrd, isNew]);

  const debouncedSaveDraft = useCallback(
    debounce((t: string, s: PrdSection[]) => {
      if (isNew) saveDraft({ title: t, sections: s });
    }, 2000),
    [isNew]
  );

  const handleTitleChange = (newTitle: string): void => {
    setTitle(newTitle);
    debouncedSaveDraft(newTitle, sections);
  };

  const handleSectionChange = (index: number, content: string): void => {
    const updated = sections.map((s, i) => (i === index ? { ...s, content } : s));
    setSections(updated);
    debouncedSaveDraft(title, updated);
  };

  const calculateCompleteness = (secs: PrdSection[]): number => {
    const requiredSections = secs.filter((s) => s.required);
    const completedRequired = requiredSections.filter((s) => s.content.replace(/<[^>]*>/g, '').trim().length > 0);
    return Math.round((completedRequired.length / requiredSections.length) * 100);
  };

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const newPrd = await createPrd(title);
        await updatePrd(newPrd.id, { title, status, sections });
        clearDraft();
        navigate(`/prd/${newPrd.id}`, { replace: true });
      } else if (id) {
        await updatePrd(id, { title, status, sections });
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (!id || isNew) return;
    try {
      const blob = await downloadPrd(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'prd'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleContinueDraft = (): void => {
    if (pendingDraft) {
      setTitle(pendingDraft.title);
      setSections(pendingDraft.sections);
    }
    setShowDraftPrompt(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = (): void => {
    clearDraft();
    setShowDraftPrompt(false);
    setPendingDraft(null);
  };

  const completeness = calculateCompleteness(sections);

  if (loading && !isNew) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
      <div className="flex-1">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            {!isNew && (
              <>
                <Link to={`/prd/${id}/view`}>
                  <button className="rounded-xl border-2 border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-all hover:border-stone-300 hover:bg-stone-50">
                    View PRD
                  </button>
                </Link>
                <button
                  onClick={handleExport}
                  className="rounded-xl border-2 border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-all hover:border-stone-300 hover:bg-stone-50"
                >
                  Export MD
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                isNew ? 'Create PRD' : 'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Title & Status */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">PRD Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter PRD title..."
              className="auth-input-warm w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PrdStatus)}
              className="auth-input-warm w-full appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a29e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-stone-900">Sections</h2>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-stone-400 to-stone-600 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-sm font-medium text-stone-500">{completeness}%</span>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section, index) => (
            <SectionAccordion
              key={section.id}
              section={section}
              onChange={(content) => handleSectionChange(index, content)}
              onPlanningRequest={() => setPlanningSection(index)}
              isActive={activeSection === index}
              onToggle={() => setActiveSection(activeSection === index ? null : index)}
              isNewPrd={isNew}
            />
          ))}
        </div>
      </div>

      {/* Planning Panel */}
      {planningSection !== null && (
        <PlanningPanel
          prdId={id || 'new'}
          section={sections[planningSection]}
          prdTitle={title}
          allSections={sections}
          onClose={() => setPlanningSection(null)}
          onApplySuggestion={(content, sectionId) => {
            const sectionIndex = sections.findIndex(s => s.id === sectionId);
            if (sectionIndex !== -1) {
              handleSectionChange(sectionIndex, content);
            }
            setPlanningSection(null);
          }}
        />
      )}

      {/* Draft Recovery Prompt */}
      {showDraftPrompt && pendingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in-up">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Unsaved Draft Found</h3>
                <p className="text-sm text-stone-500">
                  {pendingDraft.title ? `"${pendingDraft.title}"` : 'An untitled draft'}
                </p>
              </div>
            </div>
            <p className="mb-6 text-sm text-stone-600">
              You have an unsaved draft from a previous session. Would you like to continue working on it or start fresh?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardDraft}
                className="flex-1 rounded-xl border-2 border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50"
              >
                Start Fresh
              </button>
              <button
                onClick={handleContinueDraft}
                className="flex-1 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800"
              >
                Continue Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

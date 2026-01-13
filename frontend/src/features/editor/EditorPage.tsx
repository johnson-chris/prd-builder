import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePrdStore } from '@/stores/prdStore';
import { Button, Input, Select } from '@/components/ui';
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

  useEffect(() => {
    if (isNew) {
      const draft = loadDraft();
      if (draft) {
        setTitle(draft.title);
        setSections(draft.sections);
      }
    } else if (id) {
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
        await updatePrd(id, {
          title,
          status,
          sections,
        });
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

  if (loading && !isNew) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-text-muted hover:text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            {!isNew && (
              <>
                <Link to={`/prd/${id}/view`}>
                  <Button variant="secondary" size="sm">View PRD</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export MD
                </Button>
              </>
            )}
            <Button variant="accent" onClick={handleSave} isLoading={saving} disabled={!title.trim()}>
              {isNew ? 'Create PRD' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Input
            label="PRD Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter PRD title..."
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PrdStatus)}
            options={statusOptions}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Sections</h2>
          <span className="text-sm text-text-muted">
            {calculateCompleteness(sections)}% complete
          </span>
        </div>

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

      {planningSection !== null && (
        <PlanningPanel
          prdId={id || 'new'}
          section={sections[planningSection]}
          prdTitle={title}
          allSections={sections}
          onClose={() => setPlanningSection(null)}
          onApplySuggestion={(content) => {
            handleSectionChange(planningSection, content);
            setPlanningSection(null);
          }}
        />
      )}
    </div>
  );
}

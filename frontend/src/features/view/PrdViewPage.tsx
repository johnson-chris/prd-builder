import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePrdStore } from '@/stores/prdStore';
import { Button, StatusBadge } from '@/components/ui';
import { TableOfContents } from './components/TableOfContents';
import { PrdSection } from './components/PrdSection';
import { formatDate, slugify } from '@/lib/utils';

export function PrdViewPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPrd, isLoadingPrd, error, fetchPrd } = usePrdStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPrd(id);
    }
  }, [id, fetchPrd]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleJumpToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(slugify(sectionId));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Loading state
  if (isLoadingPrd) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  // Not found state
  if (!currentPrd) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-primary mb-4">PRD not found</h2>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const sortedSections = [...currentPrd.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="prd-view">
      {/* Header - hidden in print */}
      <header className="no-print mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-text-muted hover:text-primary"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        <div className="action-buttons flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleCopyLink}>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </Button>
          <Link to={`/prd/${id}`}>
            <Button variant="accent" size="sm">Edit PRD</Button>
          </Link>
        </div>
      </header>

      {/* Document Content */}
      <article className="prd-content max-w-4xl mx-auto">
        {/* Title Section */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-primary">{currentPrd.title}</h1>
            <StatusBadge status={currentPrd.status} />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text-muted">
            <div>
              <span className="block font-medium text-primary">Version</span>
              {currentPrd.version}
            </div>
            <div>
              <span className="block font-medium text-primary">Status</span>
              <span className="capitalize">{currentPrd.status.replace('-', ' ')}</span>
            </div>
            <div>
              <span className="block font-medium text-primary">Created</span>
              {formatDate(currentPrd.createdAt)}
            </div>
            <div>
              <span className="block font-medium text-primary">Last Updated</span>
              {formatDate(currentPrd.updatedAt)}
            </div>
          </div>

          {/* Completeness */}
          <div className="mt-4 no-print">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full bg-gray-100 h-2 max-w-xs">
                <div
                  className="h-2 rounded-full bg-accent transition-all"
                  style={{ width: `${currentPrd.completenessScore}%` }}
                />
              </div>
              <span className="text-sm text-text-muted">
                {currentPrd.completenessScore}% complete
              </span>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <TableOfContents
          sections={sortedSections}
          onJumpToSection={handleJumpToSection}
        />

        {/* Sections */}
        <div className="space-y-8">
          {sortedSections.map((section) => (
            <PrdSection key={section.id} section={section} />
          ))}
        </div>
      </article>
    </div>
  );
}

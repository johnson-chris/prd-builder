import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrdStore } from '@/stores/prdStore';
import { Card, StatusBadge, Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export function DashboardPage(): JSX.Element {
  const { prds, loading, error, fetchPrds, deletePrd } = usePrdStore();

  useEffect(() => {
    fetchPrds();
  }, [fetchPrds]);

  const handleDelete = async (id: string, title: string): Promise<void> => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      await deletePrd(id);
    }
  };

  if (loading && prds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Your PRDs</h1>
          <p className="text-text-muted">Manage and create product requirements documents</p>
        </div>
        <Link to="/prd/new">
          <Button variant="accent">+ New PRD</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {prds.length === 0 ? (
        <Card className="py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-primary">No PRDs yet</h3>
          <p className="mt-2 text-text-muted">Get started by creating your first PRD</p>
          <Link to="/prd/new" className="mt-6 inline-block">
            <Button variant="accent">Create your first PRD</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prds.map((prd) => (
            <Card key={prd.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link to={`/prd/${prd.id}`} className="text-lg font-medium text-primary hover:text-accent">
                    {prd.title}
                  </Link>
                  <p className="mt-1 text-sm text-text-muted">v{prd.version}</p>
                </div>
                <StatusBadge status={prd.status} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 rounded-full bg-gray-100 h-2">
                  <div
                    className="h-2 rounded-full bg-accent transition-all"
                    style={{ width: `${prd.completenessScore}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted">{prd.completenessScore}%</span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-text-muted">
                <span>Updated {formatDate(prd.updatedAt)}</span>
                <div className="flex gap-2">
                  <Link to={`/prd/${prd.id}/view`} className="rounded p-1 hover:bg-gray-100" title="View">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <Link to={`/prd/${prd.id}`} className="rounded p-1 hover:bg-gray-100" title="Edit">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleDelete(prd.id, prd.title)}
                    className="rounded p-1 text-error hover:bg-red-50"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

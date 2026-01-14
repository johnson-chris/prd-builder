import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrdStore } from '@/stores/prdStore';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'in-review': return 'bg-amber-100 text-amber-700';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'in-review': return 'In Review';
      default: return 'Draft';
    }
  };

  if (loading && prds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-4xl font-semibold text-stone-900 mb-2">Your PRDs</h1>
        <p className="text-stone-500 text-lg">Manage and create product requirements documents</p>
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

      {/* Empty State */}
      {prds.length === 0 ? (
        <div className="rounded-3xl bg-white border border-stone-200/50 p-16 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="font-display text-2xl font-medium text-stone-900 mb-2">No PRDs yet</h3>
          <p className="text-stone-500 mb-8">Get started by creating your first product requirements document</p>
          <Link to="/prd/new">
            <button className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-base font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create your first PRD
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {prds.map((prd, index) => (
            <div
              key={prd.id}
              className="group rounded-2xl bg-white border border-stone-200/50 p-6 shadow-sm transition-all hover:shadow-md hover:border-stone-300/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/prd/${prd.id}`}
                    className="block text-lg font-semibold text-stone-900 hover:text-stone-600 transition-colors truncate"
                  >
                    {prd.title}
                  </Link>
                  <p className="text-sm text-stone-400 mt-1">v{prd.version}</p>
                </div>
                <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prd.status)}`}>
                  {getStatusLabel(prd.status)}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span>Completion</span>
                  <span className="font-medium">{prd.completenessScore}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-stone-400 to-stone-600 transition-all duration-500"
                    style={{ width: `${prd.completenessScore}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <span className="text-sm text-stone-400">
                  Updated {formatDate(prd.updatedAt)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/prd/${prd.id}/view`}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                    title="View"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <Link
                    to={`/prd/${prd.id}`}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleDelete(prd.id, prd.title)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

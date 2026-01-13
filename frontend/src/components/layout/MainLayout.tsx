import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';

export function MainLayout(): JSX.Element {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async (): Promise<void> => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <svg className="h-8 w-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
              <span className="text-xl font-semibold text-primary">PRD Builder</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/prd/new"><Button variant="accent" size="sm">+ New PRD</Button></Link>
            <span className="text-sm text-text-muted">{user?.name}</span>
            <button onClick={handleLogout} className="rounded p-2 text-text-muted hover:bg-gray-100" title="Sign out">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8"><Outlet /></main>
    </div>
  );
}

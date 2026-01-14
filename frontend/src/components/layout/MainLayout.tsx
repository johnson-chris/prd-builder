import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function MainLayout(): JSX.Element {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async (): Promise<void> => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-stone-200/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-stone-900 tracking-tight">PRD Builder</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/prd/new">
              <button className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New PRD
              </button>
            </Link>
            <div className="h-6 w-px bg-stone-200" />
            <span className="text-sm text-stone-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              title="Sign out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

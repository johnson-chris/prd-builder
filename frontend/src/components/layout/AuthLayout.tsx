import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthLayout(): JSX.Element {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-page relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Ambient blobs */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      {/* Floating papers decoration */}
      <div className="floating-paper w-16 h-20 top-[15%] left-[10%] opacity-60" style={{ animationDelay: '0s' }} />
      <div className="floating-paper w-20 h-24 top-[25%] right-[15%] opacity-40" style={{ animationDelay: '-5s' }} />
      <div className="floating-paper w-14 h-18 bottom-[20%] left-[20%] opacity-50" style={{ animationDelay: '-10s' }} />
      <div className="floating-paper w-12 h-16 bottom-[30%] right-[10%] opacity-30" style={{ animationDelay: '-3s' }} />

      {/* Main card */}
      <div className="auth-card relative z-10 w-full max-w-md rounded-3xl p-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
          </div>
          <span className="text-2xl font-semibold text-stone-900 tracking-tight">PRD Builder</span>
        </div>

        <Outlet />
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-8 left-0 right-0 text-center text-sm text-stone-400">
        Crafting better products, one requirement at a time
      </p>
    </div>
  );
}

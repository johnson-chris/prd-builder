import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthLayout(): JSX.Element {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:bg-primary lg:px-12">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <svg className="h-12 w-12 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
            <span className="text-3xl font-bold text-white">PRD Builder</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white">Create comprehensive PRDs with AI assistance</h1>
          <p className="text-lg text-primary-300">Streamline your product requirements documentation with guided workflows and intelligent planning suggestions powered by Claude.</p>
        </div>
      </div>
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md"><Outlet /></div>
      </div>
    </div>
  );
}
